from typing import List, Optional
from uuid import UUID
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.hostels.models import Hostel, HostelBlock, HostelAmenity, Amenity, HostelImage
from app.hostels.schema import HostelCreate, HostelImageCreate, AmenityCreate
import hashlib

class HostelService:
    def __init__(self, session: AsyncSession):
        self.session = session

    def generate_hash(self, data: str, previous_hash: Optional[str]) -> str:
        """Generate SHA256 hash combining data and previous hash."""
        text = f"{data}{previous_hash or ''}"
        return hashlib.sha256(text.encode()).hexdigest()

    async def create_hostel(self, data: HostelCreate) -> Hostel:
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
        for amenity_id in data.amenity_ids or []:
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
            # Build change summary
            data = "; ".join(changed_fields)

            # Get previous block hash
            result = await self.session.execute(
                select(HostelBlock)
                .where(HostelBlock.hostel_id == hostel_id)
                .order_by(HostelBlock.created_at.desc())
            )
            previous_block = result.scalars().first()
            previous_hash = previous_block.hash if previous_block else None

            # Create new blockchain block
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

        # Get previous block hash
        result = await self.session.execute(
            select(HostelBlock)
            .where(HostelBlock.hostel_id == hostel_id)
            .order_by(HostelBlock.created_at.desc())
        )
        previous_block = result.scalars().first()
        previous_hash = previous_block.hash if previous_block else None

        # Log deletion
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

    # ----------------------------
    # New method: blockchain history
    # ----------------------------
    async def get_blockchain_history(self, hostel_id: UUID) -> List[dict]:
        """
        Returns a list of all blocks for a hostel in chronological order.
        Each block contains: id, data, previous_hash, hash, created_at
        """
        result = await self.session.execute(
            select(HostelBlock)
            .where(HostelBlock.hostel_id == hostel_id)
            .order_by(HostelBlock.created_at.asc())
        )
        blocks = result.scalars().all()
        history = [
            {
                "id": block.id,
                "data": block.data,
                "previous_hash": block.previous_hash,
                "hash": block.hash,
                "created_at": block.created_at
            }
            for block in blocks
        ]
        return history