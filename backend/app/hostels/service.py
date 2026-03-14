from typing import List, Optional
from unittest import result
from uuid import UUID
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.hostels.models import Amenity, Hostel, HostelAmenity, HostelImage, HostelBlock
from app.hostels.schema import AmenityCreate, HostelImageCreate, HostelRead, HostelStatus, PaginatedHostels
import hashlib
from sqlalchemy import func, desc
from sqlalchemy.orm import selectinload

class HostelService:
    def __init__(self, session: AsyncSession):
        self.session = session

    def generate_hash(self, data: str, previous_hash: Optional[str]) -> str:
        text = f"{data}{previous_hash or ''}"
        return hashlib.sha256(text.encode()).hexdigest()

    async def create_hostel(self, data, owner_id: UUID) -> Hostel:
        hostel = Hostel(
            name=data.name,
            description=data.description,
            location=data.location,
            latitude=data.latitude,
            longitude=data.longitude,
            status=data.status,
            owner_id=owner_id  
        )

        self.session.add(hostel)
        await self.session.flush()

        amenity_ids = getattr(data, "amenity_ids", []) or []

        if amenity_ids:
            result = await self.session.execute(
                select(Amenity.id).where(Amenity.id.in_(amenity_ids))
            )
            valid_ids = set(result.scalars().all())

            for amenity_id in amenity_ids:
                if amenity_id not in valid_ids:
                    raise ValueError(f"Amenity {amenity_id} does not exist")

                link = HostelAmenity(
                    hostel_id=hostel.id,
                    amenity_id=amenity_id
                )
                self.session.add(link)


        initial_block = HostelBlock(
            hostel_id=hostel.id,
            data="Initial creation",
            previous_hash=None,
            hash=self.generate_hash("Initial creation", None)
        )

        self.session.add(initial_block)

        return hostel

    async def update_hostel(self, hostel_id: UUID, **updates) -> Optional[Hostel]:
        # Fetch the hostel first
        hostel = await self.get_hostel(hostel_id)
        if not hostel:
            return None

        changed_fields = []

        # Apply updates and track changed fields
        for field, value in updates.items():
            if hasattr(hostel, field) and getattr(hostel, field) != value:
                setattr(hostel, field, value)
                changed_fields.append(f"{field}={value}")

        # If any fields changed, create a block
        if changed_fields:
            data = "; ".join(changed_fields)
            previous_block = await self._get_last_block(hostel_id)
            previous_hash = previous_block.hash if previous_block else None

            block = HostelBlock(
                hostel_id=hostel.id,
                data=data,
                previous_hash=previous_hash,
                hash=self.generate_hash(data, previous_hash)
            )
            self.session.add(block)

        # Flush updates to DB
        await self.session.flush()

        # ✅ Explicitly reload hostel with relationships to avoid MissingGreenlet
        result = await self.session.execute(
            select(Hostel)
            .where(Hostel.id == hostel_id)
            .options(
                selectinload(Hostel.amenities),
                selectinload(Hostel.images),
                selectinload(Hostel.blocks)
            )
        )
        hostel_with_rels = result.scalar_one_or_none()
        return hostel_with_rels
    

    async def delete_hostel(self, hostel_id: UUID) -> bool:
        hostel = await self.get_hostel(hostel_id)
        if not hostel:
            return False

        previous_block = await self._get_last_block(hostel_id)
        previous_hash = previous_block.hash if previous_block else None

        # Log deletion in blockchain
        block = HostelBlock(
            hostel_id=hostel.id,
            data="Hostel deleted",
            previous_hash=previous_hash,
            hash=self.generate_hash("Hostel deleted", previous_hash)
        )
        self.session.add(block)

        # Soft delete
        hostel.is_deleted = True
        self.session.add(hostel)
        await self.session.flush()

        return True


    async def get_hostel(self, hostel_id: UUID, include_deleted: bool = False) -> Optional[Hostel]:
        query = select(Hostel).where(Hostel.id == hostel_id)
        if not include_deleted:
            query = query.where(Hostel.is_deleted == False)  # <-- filter soft-deleted

        query = query.options(
            selectinload(Hostel.amenities),
            selectinload(Hostel.images),
            selectinload(Hostel.blocks),
        )

        result = await self.session.execute(query)
        return result.scalar_one_or_none()
    
    async def get_all_hostels(
        self,
        limit: int = 50,
        offset: int = 0,
        status: Optional[HostelStatus] = None,
        include_deleted: bool = False
    ) -> PaginatedHostels:
        base_query = select(Hostel).options(
            selectinload(Hostel.amenities),
            selectinload(Hostel.images),
            selectinload(Hostel.blocks)
        )

        if status:
            base_query = base_query.where(Hostel.status == status)

        if not include_deleted:
            base_query = base_query.where(Hostel.is_deleted == False)  # <-- filter soft-deleted

        data_query = base_query.order_by(desc(Hostel.created_at)).offset(offset).limit(limit)
        result = await self.session.execute(data_query)
        hostels = result.scalars().all()

        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        return PaginatedHostels(
            total=total,
            limit=limit,
            offset=offset,
            hostels=[HostelRead.model_validate(h) for h in hostels],
        )
    
    async def get_blockchain_history(self, hostel_id: UUID) -> List[dict]:

        result = await self.session.execute(
            select(HostelBlock)
            .where(HostelBlock.hostel_id == hostel_id)
            .order_by(HostelBlock.created_at.asc())
        )

        blocks = result.scalars().all()

        return [
            {
                "id": block.id,
                "data": block.data,
                "previous_hash": block.previous_hash,
                "hash": block.hash,
                "created_at": block.created_at
            }
            for block in blocks
        ]

    async def _get_last_block(self, hostel_id: UUID) -> Optional[HostelBlock]:

        result = await self.session.execute(
            select(HostelBlock)
            .where(HostelBlock.hostel_id == hostel_id)
            .order_by(HostelBlock.created_at.desc())
        )

        return result.scalars().first()



class AmenityService:

    def __init__(self, session: AsyncSession, hostel_service: HostelService):
        self.session = session
        self.hostel_service = hostel_service

    async def create_amenity(self, data: AmenityCreate) -> Amenity:

        amenity = Amenity(name=data.name)

        self.session.add(amenity)

        return amenity

    async def list_amenities(self) -> List[Amenity]:

        result = await self.session.execute(select(Amenity))

        return result.scalars().all()

    async def add_amenity_to_hostel(self, hostel_id: UUID, amenity_id: UUID) -> bool:

        hostel = await self.hostel_service.get_hostel(hostel_id)

        if not hostel:
            return False

        link = HostelAmenity(
            hostel_id=hostel_id,
            amenity_id=amenity_id
        )

        self.session.add(link)

        previous_block = await self.hostel_service._get_last_block(hostel_id)
        previous_hash = previous_block.hash if previous_block else None

        block = HostelBlock(
            hostel_id=hostel_id,
            data=f"Added amenity {amenity_id}",
            previous_hash=previous_hash,
            hash=self.hostel_service.generate_hash(
                f"Added amenity {amenity_id}",
                previous_hash
            )
        )

        self.session.add(block)

        return True

    async def remove_amenity_from_hostel(self, hostel_id: UUID, amenity_id: UUID) -> bool:

        result = await self.session.execute(
            select(HostelAmenity)
            .where(HostelAmenity.hostel_id == hostel_id)
            .where(HostelAmenity.amenity_id == amenity_id)
        )

        link = result.scalar_one_or_none()

        if not link:
            return False

        await self.session.delete(link)

        previous_block = await self.hostel_service._get_last_block(hostel_id)
        previous_hash = previous_block.hash if previous_block else None

        block = HostelBlock(
            hostel_id=hostel_id,
            data=f"Removed amenity {amenity_id}",
            previous_hash=previous_hash,
            hash=self.hostel_service.generate_hash(
                f"Removed amenity {amenity_id}",
                previous_hash
            )
        )

        self.session.add(block)

        return True



class HostelImageService:

    def __init__(self, session: AsyncSession, hostel_service: HostelService):
        self.session = session
        self.hostel_service = hostel_service

    async def add_image(self, data: HostelImageCreate) -> HostelImage:
        hostel = await self.hostel_service.get_hostel(data.hostel_id)

        if not hostel:
            raise ValueError("Hostel does not exist")

        # Fetch existing images for this hostel
        result = await self.session.execute(
            select(HostelImage).where(HostelImage.hostel_id == data.hostel_id)
        )
        existing_images = result.scalars().all()

        # If this is the first image, force it to be primary
        if not existing_images:
            data.is_primary = True

        # If adding a primary image, reset others
        if data.is_primary:
            for img in existing_images:
                img.is_primary = False

        # Create the new image
        image = HostelImage(
            hostel_id=data.hostel_id,
            image_url=data.image_url,
            public_id=data.public_id,
            is_primary=data.is_primary
        )
        self.session.add(image)

        # Add a blockchain record for this action
        previous_block = await self.hostel_service._get_last_block(data.hostel_id)
        previous_hash = previous_block.hash if previous_block else None

        block = HostelBlock(
            hostel_id=data.hostel_id,
            data=f"Added image {data.image_url}",
            previous_hash=previous_hash,
            hash=self.hostel_service.generate_hash(
                f"Added image {data.image_url}",
                previous_hash
            )
        )
        self.session.add(block)

        return image
    async def delete_image(self, image_id: UUID) -> bool:

        result = await self.session.execute(
            select(HostelImage).where(HostelImage.id == image_id)
        )

        image = result.scalar_one_or_none()

        if not image:
            return False

        previous_block = await self.hostel_service._get_last_block(image.hostel_id)
        previous_hash = previous_block.hash if previous_block else None

        block = HostelBlock(
            hostel_id=image.hostel_id,
            data=f"Deleted image {image.image_url}",
            previous_hash=previous_hash,
            hash=self.hostel_service.generate_hash(
                f"Deleted image {image.image_url}",
                previous_hash
            )
        )

        self.session.add(block)

        await self.session.delete(image)

        return True
    
    async def set_primary_image(self, image_id: UUID) -> Optional[HostelImage]:

        result = await self.session.execute(
            select(HostelImage).where(HostelImage.id == image_id)
        )

        image = result.scalar_one_or_none()

        if not image:
            return None

        hostel_id = image.hostel_id

        # Reset all images for this hostel
        result = await self.session.execute(
            select(HostelImage).where(HostelImage.hostel_id == hostel_id)
        )

        images = result.scalars().all()

        for img in images:
            img.is_primary = False

        # Set selected image as primary
        image.is_primary = True

        previous_block = await self.hostel_service._get_last_block(hostel_id)
        previous_hash = previous_block.hash if previous_block else None

        block = HostelBlock(
            hostel_id=hostel_id,
            data=f"Set primary image {image.image_url}",
            previous_hash=previous_hash,
            hash=self.hostel_service.generate_hash(
                f"Set primary image {image.image_url}",
                previous_hash
            )
        )

        self.session.add(block)

        return image