import api from "./axios";

export const requestEmailChange = (data) =>
  api.post("/users/me/request-email-change", data);

export const requestPhoneChange = (data) =>
  api.post("/users/me/request-phone-change", data);

export const requestPasswordChange = (data) =>
  api.post("/users/me/change-password", data);