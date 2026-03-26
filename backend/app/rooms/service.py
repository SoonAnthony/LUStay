from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import UploadFile
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from sqlalchemy.orm import selectinload
from app.rooms.models import Room, RoomImage, RoomStatus
from app.rooms.schema import RoomCreate, RoomUpdate
from app.core.cloudinary_services import upload_image, upload_images, delete_image

class RoomService:
    def __init__(self, session: AsyncSession, current_user: dict):
        self.session = session
        self.current_user = current_user

   
    def _compute_status(self, room: Room) -> RoomStatus:
        if room.is_under_maintenance:
            return RoomStatus.MAINTENANCE
        if room.current_occupancy == 0:
            return RoomStatus.AVAILABLE
        if room.current_occupancy < room.capacity:
            return RoomStatus.PARTIALLY_OCCUPIED
        return RoomStatus.FULLY_OCCUPIED

    async def increment_occupancy(self, room_id: UUID) -> Room:
        room = await self.get_room_by_id(room_id)
        if not room:
            raise ValueError("Room not found")
        self._check_ownership(room)

        if room.is_under_maintenance:
            raise ValueError("Cannot occupy a room under maintenance")


        if room.current_occupancy >= room.capacity:
            raise ValueError("Room is already fully occupied")

        room.current_occupancy += 1

        room.status = self._compute_status(room)

        self.session.add(room)
        await self.session.flush()
        await self.session.refresh(room)

        return room


    async def decrement_occupancy(self, room_id: UUID) -> Room:
        room = await self.get_room_by_id(room_id)
        if not room:
            raise ValueError("Room not found")
        self._check_ownership(room)
        
        if room.current_occupancy <= 0:
            raise ValueError("Room is already empty")

        room.current_occupancy -= 1

        room.status = self._compute_status(room)

        self.session.add(room)
        await self.session.flush()
        await self.session.refresh(room)

        return room
    
    def _check_ownership(self, room: Room):
        if self.current_user["role"] == "admin":
            return  # admin bypass

        if room.owner_id != self.current_user["id"]:
            raise ValueError("Not authorized to perform this action")
    
    async def create_room(self, hostel_id: UUID, data: RoomCreate) -> Room:
        if data.capacity not in [1, 2]:
            raise ValueError("Room capacity must be 1 or 2")

        if data.capacity == 2 and not data.price_double:
            raise ValueError("Shared room must have price_double")

        if data.capacity == 1 and data.price_double:
            raise ValueError("Single capacity room cannot have price_double")

        room = Room(
            hostel_id=hostel_id,
            owner_id=self.current_user["id"],
            room_number=data.room_number,
            capacity=data.capacity,
            price_single=data.price_single,
            price_double=data.price_double,
            current_occupancy=0,
            is_under_maintenance=False,
        )


        room.status = self._compute_status(room)

        self.session.add(room)
        await self.session.flush()

        if data.images:
            for img in data.images:
                result = upload_image(img["file"], folder=f"rooms/{room.id}")
                image = RoomImage(
                    room_id=room.id,
                    image_url=result["secure_url"],
                    public_id=result["public_id"],
                    image_type=img.get("image_type")
                )
                self.session.add(image)

        await self.session.refresh(room)
        return room


    async def get_room_by_id(self, room_id: UUID) -> Optional[Room]:
        statement = select(Room).where(Room.id == room_id).options(selectinload(Room.images))
        if self.current_user["role"] != "admin":
            statement = statement.where(Room.owner_id == self.current_user["id"])
        result = await self.session.exec(statement)
        return result.first()

 
    async def get_rooms(
        self,
        hostel_id: Optional[UUID] = None,
        min_price: Optional[int] = None,
        max_price: Optional[int] = None,
        capacity: Optional[int] = None,
        status: Optional[RoomStatus] = None,
    ) -> List[Room]:

        statement = select(Room).options(selectinload(Room.images))
        if self.current_user["role"] != "admin":
            statement = statement.where(Room.owner_id == self.current_user["id"])
        if hostel_id:
            statement = statement.where(Room.hostel_id == hostel_id)
        if capacity:
            statement = statement.where(Room.capacity == capacity)
        if status:
            statement = statement.where(Room.status == status)
        if min_price:
            statement = statement.where(Room.price_single >= min_price)
        if max_price:
            statement = statement.where(Room.price_single <= max_price)

        result = await self.session.exec(statement)
        return result.all()

 
    async def update_room(self, room_id: UUID, data: RoomUpdate) -> Room:
        room = await self.get_room_by_id(room_id)
        if not room:
            raise ValueError("Room not found")
        
        self._check_ownership(room)
        update_data = data.dict(exclude_unset=True)
        update_data.pop("status", None)  # prevent manual override

        for key, value in update_data.items():
            setattr(room, key, value)

        room.updated_at = datetime.utcnow()

        if room.current_occupancy < 0:
            room.current_occupancy = 0
        if room.current_occupancy > room.capacity:
            raise ValueError("Occupancy cannot exceed room capacity")

        if room.capacity not in [1, 2]:
            raise ValueError("Room capacity must be 1 or 2")
        if room.capacity == 2 and not room.price_double:
            raise ValueError("Shared room must have price_double")
        if room.capacity == 1:
            room.price_double = None

        room.status = self._compute_status(room)

        self.session.add(room)
        await self.session.flush()
        await self.session.refresh(room)
        return room

    
    async def delete_room(self, room_id: UUID) -> None:
        room = await self.get_room_by_id(room_id)
        if not room:
            raise ValueError("Room not found")
        self._check_ownership(room)
        await self.session.delete(room)

   
    async def get_available_rooms(self) -> List[Room]:
        statement = select(Room).where(Room.status == RoomStatus.AVAILABLE)
        result = await self.session.exec(statement)
        return result.all()

    
    async def get_room_pricing(self, room_id: UUID) -> dict:
        room = await self.get_room_by_id(room_id)
        if not room:
            raise ValueError("Room not found")
        self._check_ownership(room)
        return {
            "price_single": room.price_single,
            "price_double": room.price_double,
            "capacity": room.capacity,
        }

    
    async def add_room_images(
        self,
        room_id: UUID,
        images: List[UploadFile],  # now directly UploadFile
        image_type: Optional[str] = None,  # optional type applied to all
    ) -> List[RoomImage]:
        room = await self.get_room_by_id(room_id)
        if not room:
            raise ValueError("Room not found")
        self._check_ownership(room)

        created_images = []
        for img in images:
            #upload image to cloudinary and get the URL
            result = upload_image(img["file"], folder=f"rooms/{room.id}")
            # Save Cloudinary URL to database
            image = RoomImage(
                room_id=room_id,
                image_url=result["secure_url"],
                public_id=result["public_id"],
                image_type=image_type
            )
            self.session.add(image)
            created_images.append(image)

        await self.session.flush()
        return created_images

    async def delete_room_image(self, image_id: UUID) -> None:
        statement = select(RoomImage).where(RoomImage.id == image_id)
        result = await self.session.exec(statement)
        image = result.first()
        if not image:
            raise ValueError("Image not found")
        room = await self.get_room_by_id(image.room_id)
        self._check_ownership(room)
        delete_image(image.public_id)
        await self.session.delete(image)

    async def set_maintenance(self, room_id: UUID, value: bool) -> Room:
        room = await self.get_room_by_id(room_id)
        if not room:
            raise ValueError("Room not found")
        self._check_ownership(room)
        room.is_under_maintenance = value
        room.status = self._compute_status(room)
        self.session.add(room)
        await self.session.flush()
        await self.session.refresh(room)
        return room