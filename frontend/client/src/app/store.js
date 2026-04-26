import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import bookingsReducer from "../features/bookings/bookingsSlice";
import userReducer from "../features/user/userSlice";
import landlordReducer from "../features/landlord/landlordSlice";
import hostelReducer from "../features/hostels/hostelSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    bookings: bookingsReducer,
    user: userReducer, 
    landlord: landlordReducer,  
    hostels: hostelReducer,
  },
});