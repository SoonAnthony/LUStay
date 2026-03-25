from typing import List, Optional
from uuid import UUID
from datetime import datetime

from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from app.rooms.models import Room, RoomImage, RoomStatus
from app.rooms.schema import RoomCreate, RoomUpdate


class RoomService:
    def __init__(self, session: AsyncSession):
        self.session = session

   
    def _compute_status(self, room: Room) -> RoomStatus:
        if room.is_under_maintenance:
            return RoomStatus.MAINTENANCE
        if room.current_occupancy == 0:
            return RoomStatus.AVAILABLE
        if room.current_occupancy < room.capacity:
            return RoomStatus.PARTIALLY_OCCUPIED
        return RoomStatus.FULLY_OCCUPIED

    
    async def create_room(self, hostel_id: UUID, data: RoomCreate) -> Room:
        if data.capacity not in [1, 2]:
            raise ValueError("Room capacity must be 1 or 2")

        if data.capacity == 2 and not data.price_double:
            raise ValueError("Shared room must have price_double")

        if data.capacity == 1 and data.price_double:
            raise ValueError("Single capacity room cannot have price_double")

        room = Room(
            hostel_id=hostel_id,
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
                image = RoomImage(
                    room_id=room.id,
                    image_url=img.image_url,
                    image_type=img.image_type,
                )
                self.session.add(image)

        await self.session.refresh(room)
        return room


    async def get_room_by_id(self, room_id: UUID) -> Optional[Room]:
        statement = select(Room).where(Room.id == room_id)
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

        statement = select(Room)

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
        await self.session.delete(room)

   
    async def get_available_rooms(self) -> List[Room]:
        statement = select(Room).where(Room.status == RoomStatus.AVAILABLE)
        result = await self.session.exec(statement)
        return result.all()

    
    async def get_room_pricing(self, room_id: UUID) -> dict:
        room = await self.get_room_by_id(room_id)
        if not room:
            raise ValueError("Room not found")
        return {
            "price_single": room.price_single,
            "price_double": room.price_double,
            "capacity": room.capacity,
        }

    
    async def add_room_images(
        self,
        room_id: UUID,
        images: List[dict]
    ) -> List[RoomImage]:
        room = await self.get_room_by_id(room_id)
        if not room:
            raise ValueError("Room not found")

        created_images = []
        for img in images:
            image = RoomImage(
                room_id=room_id,
                image_url=img["image_url"],
                image_type=img.get("image_type"),
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
        await self.session.delete(image)

    async def set_maintenance(self, room_id: UUID, value: bool) -> Room:
        room = await self.get_room_by_id(room_id)
        if not room:
            raise ValueError("Room not found")
        room.is_under_maintenance = value
        room.status = self._compute_status(room)
        self.session.add(room)
        await self.session.flush()
        await self.session.refresh(room)
        return room