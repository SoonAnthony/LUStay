from typing import List, Optional
from uuid import UUID
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.hostels.models import Amenity, Hostel, HostelAmenity, HostelImage, HostelBlock
from app.hostels.schema import AmenityCreate, HostelImageCreate
import hashlib


class HostelService:
    def __init__(self, session: AsyncSession):
        self.session = session

    def generate_hash(self, data: str, previous_hash: Optional[str]) -> str:
        """Generate SHA256 hash combining data and previous hash."""
        text = f"{data}{previous_hash or ''}"
        return hashlib.sha256(text.encode()).hexdigest()

    async def create_hostel(self, data) -> Hostel:
        hostel = Hostel(
            name=data.name,
            description=data.description,
            location=data.location,
            latitude=data.latitude,
            longitude=data.longitude,
            status=data.status,
            owner_id=data.owner_id
        )
        self.session.add(hostel)
        await self.session.flush()  # to get hostel.id

        # Add amenities
        for amenity_id in getattr(data, "amenity_ids", []) or []:
            link = HostelAmenity(hostel_id=hostel.id, amenity_id=amenity_id)
            self.session.add(link)

        # Initial blockchain block
        initial_block = HostelBlock(
            hostel_id=hostel.id,
            data="Initial creation",
            previous_hash=None,
            hash=self.generate_hash("Initial creation", None)
        )
        self.session.add(initial_block)

        await self.session.commit()
        await self.session.refresh(hostel)
        return hostel

    async def update_hostel(self, hostel_id: UUID, **updates) -> Optional[Hostel]:
        hostel = await self.get_hostel(hostel_id)
        if not hostel:
            return None

        changed_fields = []
        for field, value in updates.items():
            if hasattr(hostel, field) and getattr(hostel, field) != value:
                setattr(hostel, field, value)
                changed_fields.append(f"{field}={value}")

        if changed_fields:
            data = "; ".join(changed_fields)
            previous_block = await self._get_last_block(hostel_id)
            previous_hash = previous_block.hash if previous_block else None

            # Add new block
            new_block = HostelBlock(
                hostel_id=hostel.id,
                data=data,
                previous_hash=previous_hash,
                hash=self.generate_hash(data, previous_hash)
            )
            self.session.add(new_block)

        await self.session.commit()
        await self.session.refresh(hostel)
        return hostel

    async def delete_hostel(self, hostel_id: UUID) -> bool:
        hostel = await self.get_hostel(hostel_id)
        if not hostel:
            return False

        previous_block = await self._get_last_block(hostel_id)
        previous_hash = previous_block.hash if previous_block else None

        block = HostelBlock(
            hostel_id=hostel.id,
            data="Hostel deleted",
            previous_hash=previous_hash,
            hash=self.generate_hash("Hostel deleted", previous_hash)
        )
        self.session.add(block)

        await self.session.delete(hostel)
        await self.session.commit()
        return True

    async def get_hostel(self, hostel_id: UUID) -> Optional[Hostel]:
        result = await self.session.execute(select(Hostel).where(Hostel.id == hostel_id))
        return result.scalar_one_or_none()

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
        """Internal helper to get last block of a hostel."""
        result = await self.session.execute(
            select(HostelBlock)
            .where(HostelBlock.hostel_id == hostel_id)
            .order_by(HostelBlock.created_at.desc())
        )
        return result.scalars().first()


# ----------------------------
# Amenity Service
# ----------------------------
class AmenityService:
    def __init__(self, session: AsyncSession, hostel_service: HostelService):
        self.session = session
        self.hostel_service = hostel_service

    async def create_amenity(self, data: AmenityCreate) -> Amenity:
        amenity = Amenity(name=data.name)
        self.session.add(amenity)
        await self.session.commit()
        await self.session.refresh(amenity)
        return amenity

    async def get_amenity(self, amenity_id: UUID) -> Optional[Amenity]:
        result = await self.session.execute(select(Amenity).where(Amenity.id == amenity_id))
        return result.scalar_one_or_none()

    async def list_amenities(self) -> List[Amenity]:
        result = await self.session.execute(select(Amenity))
        return result.scalars().all()

    async def add_amenity_to_hostel(self, hostel_id: UUID, amenity_id: UUID) -> bool:
        hostel = await self.hostel_service.get_hostel(hostel_id)
        if not hostel:
            return False
        link = HostelAmenity(hostel_id=hostel_id, amenity_id=amenity_id)
        self.session.add(link)

        # Blockchain block
        previous_block = await self.hostel_service._get_last_block(hostel_id)
        previous_hash = previous_block.hash if previous_block else None
        block = HostelBlock(
            hostel_id=hostel_id,
            data=f"Added amenity {amenity_id}",
            previous_hash=previous_hash,
            hash=self.hostel_service.generate_hash(f"Added amenity {amenity_id}", previous_hash)
        )
        self.session.add(block)
        await self.session.commit()
        return True

    async def remove_amenity_from_hostel(self, hostel_id: UUID, amenity_id: UUID) -> bool:
        hostel = await self.hostel_service.get_hostel(hostel_id)
        if not hostel:
            return False
        link = await self.session.execute(
            select(HostelAmenity)
            .where(HostelAmenity.hostel_id == hostel_id)
            .where(HostelAmenity.amenity_id == amenity_id)
        )
        link_obj = link.scalar_one_or_none()
        if not link_obj:
            return False
        await self.session.delete(link_obj)

        previous_block = await self.hostel_service._get_last_block(hostel_id)
        previous_hash = previous_block.hash if previous_block else None
        block = HostelBlock(
            hostel_id=hostel_id,
            data=f"Removed amenity {amenity_id}",
            previous_hash=previous_hash,
            hash=self.hostel_service.generate_hash(f"Removed amenity {amenity_id}", previous_hash)
        )
        self.session.add(block)
        await self.session.commit()
        return True


# ----------------------------
# Hostel Image Service
# ----------------------------
class HostelImageService:
    def __init__(self, session: AsyncSession, hostel_service: HostelService):
        self.session = session
        self.hostel_service = hostel_service

    async def add_image(self, data: HostelImageCreate) -> HostelImage:
        hostel = await self.hostel_service.get_hostel(data.hostel_id)
        if not hostel:
            raise ValueError("Hostel does not exist")

        image = HostelImage(
            hostel_id=data.hostel_id,
            image_url=data.image_url,
            public_id=data.public_id,
            is_primary=data.is_primary
        )
        self.session.add(image)

        previous_block = await self.hostel_service._get_last_block(data.hostel_id)
        previous_hash = previous_block.hash if previous_block else None

        block = HostelBlock(
            hostel_id=data.hostel_id,
            data=f"Added image {data.image_url}",
            previous_hash=previous_hash,
            hash=self.hostel_service.generate_hash(f"Added image {data.image_url}", previous_hash)
        )
        self.session.add(block)

        await self.session.commit()
        await self.session.refresh(image)
        return image

    async def delete_image(self, image_id: UUID) -> bool:
        result = await self.session.execute(select(HostelImage).where(HostelImage.id == image_id))
        image = result.scalar_one_or_none()
        if not image:
            return False

        previous_block = await self.hostel_service._get_last_block(image.hostel_id)
        previous_hash = previous_block.hash if previous_block else None

        block = HostelBlock(
            hostel_id=image.hostel_id,
            data=f"Deleted image {image.image_url}",
            previous_hash=previous_hash,
            hash=self.hostel_service.generate_hash(f"Deleted image {image.image_url}", previous_hash)
        )
        self.session.add(block)

        await self.session.delete(image)
        await self.session.commit()
        return True