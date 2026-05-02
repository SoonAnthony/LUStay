from fastapi import HTTPException
from typing import List, Optional
from uuid import UUID
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from sqlalchemy.orm import selectinload

from app.rooms.models import Room, RoomType, RoomTypeImage, RoomStatus
from app.rooms.schema import RoomCreate, RoomUpdate, RoomTypeCreate, RoomTypeImageRead
from app.hostels.models import Hostel
from app.user.models import User
from app.core.cloudinary_services import upload_images


class RoomService:
    ALLOWED_ROOM_TYPES = {"Self", "Single"}

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_room_type(self, data: RoomTypeCreate, current_user: User) -> RoomType:
        if current_user.role == "ADMIN":
            raise PermissionError("Admins cannot create RoomTypes; only landlords can")

        if data.name not in self.ALLOWED_ROOM_TYPES:
            raise ValueError(f"Invalid room type name. Allowed: {self.ALLOWED_ROOM_TYPES}")

        hostel = await self.session.get(Hostel, data.hostel_id)
        if not hostel:
            raise ValueError("Hostel does not exist")

        if hostel.owner_id != current_user.id:
            raise PermissionError("You do not own this hostel")

        existing = (await self.session.exec(
            select(RoomType).where(
                RoomType.hostel_id == data.hostel_id,
                RoomType.name == data.name
            )
        )).first()

        if existing:
            raise ValueError(f"{data.name} room type already exists for this hostel")

        room_type = RoomType(**data.dict())
        self.session.add(room_type)

        await self.session.flush()

        room_type_id = room_type.id

        await self.session.commit()

        result = await self.session.execute(
            select(RoomType)
            .options(selectinload(RoomType.images))
            .where(RoomType.id == room_type_id)
        )

        return result.scalar_one()

    async def add_roomtype_images(self, room_type_id: UUID, files: List, current_user: User) -> List[RoomTypeImage]:
        room_type = await self.session.get(RoomType, room_type_id)
        if not room_type:
            raise ValueError("Room type does not exist")

        hostel = await self.session.get(Hostel, room_type.hostel_id)
        if current_user.role != "ADMIN" and hostel.owner_id != current_user.id:
            raise PermissionError("You do not own this hostel")

        uploaded_results = await upload_images(files, folder=f"hostels/{hostel.id}/{room_type.id}")

        images = []
        for result in uploaded_results:
            img = RoomTypeImage(
                room_type_id=room_type.id,
                image_url=result["secure_url"]
            )
            self.session.add(img)
            images.append(img)

        await self.session.commit()
        for img in images:
            await self.session.refresh(img)

        return [RoomTypeImageRead.model_validate(img) for img in images]

    async def create_room(self, data: RoomCreate, current_user: User) -> Room:
        hostel = await self.session.get(Hostel, data.hostel_id)
        if not hostel:
            raise ValueError("Hostel does not exist")

        if current_user.role == "LANDLORD" and hostel.owner_id != current_user.id:
            raise PermissionError("You do not own this hostel")

        room_type = await self.session.get(RoomType, data.room_type_id)
        if not room_type or room_type.hostel_id != data.hostel_id:
            raise ValueError("Room type does not exist for this hostel")

        room = Room(**data.dict())
        self.session.add(room)
        await self.session.commit()
        await self.session.refresh(room)
        result = await self.session.execute(
            select(Room)
            .options(
                selectinload(Room.room_type).selectinload(RoomType.images)
            )
            .where(Room.id == room.id)
        )
        room = result.scalar_one()
        return room

    async def list_rooms(self, hostel_id: Optional[UUID] = None, room_type_id: Optional[UUID] = None) -> List[Room]:
        query = select(Room).options(
            selectinload(Room.room_type).selectinload(RoomType.images)
        )
        if hostel_id:
            query = query.where(Room.hostel_id == hostel_id)
        if room_type_id:
            query = query.where(Room.room_type_id == room_type_id)

        result = await self.session.exec(
            query.execution_options(populate_existing=True)
        )
        return result.all()

    async def get_room(self, room_id: UUID) -> Room:
        result = await self.session.execute(
            select(Room)
            .options(
                selectinload(Room.room_type).selectinload(RoomType.images)
            )
            .where(Room.id == room_id)
            .execution_options(populate_existing=True)
        )
        room = result.scalar_one_or_none()
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        return room

    async def update_room(self, room_id: UUID, data: RoomUpdate, current_user: User) -> Room:
        room = await self.session.get(Room, room_id)
        if not room:
            raise ValueError("Room not found")

        hostel = await self.session.get(Hostel, room.hostel_id)
        if current_user.role != "ADMIN" and (current_user.role == "LANDLORD" and hostel.owner_id != current_user.id):
            raise PermissionError("You do not have permission to update this room")

        update_data = data.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(room, key, value)

        if "occupants" in update_data and "status" not in update_data:
            if room.status != RoomStatus.MAINTENANCE:
                room_type = await self.session.get(RoomType, room.room_type_id)
                if room_type:
                    if room.occupants <= 0:
                        room.status = RoomStatus.AVAILABLE
                    elif room.occupants >= room_type.capacity:
                        room.status = RoomStatus.FULLY_OCCUPIED
                    else:
                        room.status = RoomStatus.PARTIALLY_OCCUPIED

        self.session.add(room)
        await self.session.commit()

        # Re-fetch with eagerly loaded room_type and images to avoid MissingGreenlet on serialization
        result = await self.session.execute(
            select(Room)
            .options(selectinload(Room.room_type).selectinload(RoomType.images))
            .where(Room.id == room_id)
        )
        return result.scalar_one()

    async def delete_room(self, room_id: UUID, current_user: User) -> None:
        room = await self.session.get(Room, room_id)
        if not room:
            raise ValueError("Room not found")

        hostel = await self.session.get(Hostel, room.hostel_id)
        if current_user.role != "ADMIN" and (current_user.role == "LANDLORD" and hostel.owner_id != current_user.id):
            raise PermissionError("You do not have permission to delete this room")

        await self.session.delete(room)
        await self.session.commit()

    async def delete_roomtype_image(self, image_id: UUID, current_user: User) -> None:
        image = await self.session.get(RoomTypeImage, image_id)
        if not image:
            raise HTTPException(status_code=404, detail="Image not found")

        room_type = await self.session.get(RoomType, image.room_type_id)
        if not room_type:
            raise HTTPException(status_code=404, detail="Room type not found")

        hostel = await self.session.get(Hostel, room_type.hostel_id)
        if not hostel:
            raise HTTPException(status_code=404, detail="Hostel not found")

        if current_user.role != "ADMIN" and hostel.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="You do not own this hostel")

        await self.session.delete(image)
        await self.session.commit()