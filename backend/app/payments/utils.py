import base64
import httpx
from datetime import datetime
from app.core.config import settings


CONSUMER_KEY        = settings.MPESA_CONSUMER_KEY
CONSUMER_SECRET     = settings.MPESA_CONSUMER_SECRET
SHORTCODE           = settings.MPESA_SHORTCODE
PASSKEY             = settings.MPESA_PASSKEY
CALLBACK_URL        = settings.MPESA_CALLBACK_URL
ENV                 = settings.MPESA_ENV
SECURITY_CREDENTIAL = settings.MPESA_SECURITY_CREDENTIAL

BASE_URL = (
    "https://sandbox.safaricom.co.ke"
    if ENV == "sandbox"
    else "https://api.safaricom.co.ke"
)


# 1. Get Access Token
async def get_access_token() -> str:
    auth_string = f"{CONSUMER_KEY}:{CONSUMER_SECRET}"
    encoded = base64.b64encode(auth_string.encode()).decode()

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/oauth/v1/generate?grant_type=client_credentials",
            headers={"Authorization": f"Basic {encoded}"},
        )
        response.raise_for_status()
        return response.json()["access_token"]


# 2. STK Push
# NOTE: amount is kept at 1 for sandbox — Daraja sandbox only accepts KES 1
async def stk_push(phone_number: str, amount: int, account_reference: str) -> dict:
    token = await get_access_token()
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(
        f"{SHORTCODE}{PASSKEY}{timestamp}".encode()
    ).decode()

    payload = {
        "BusinessShortCode": SHORTCODE,
        "Password":          password,
        "Timestamp":         timestamp,
        "TransactionType":   "CustomerPayBillOnline",
        "Amount":            amount,
        "PartyA":            phone_number,
        "PartyB":            SHORTCODE,
        "PhoneNumber":       phone_number,
        "CallBackURL":       CALLBACK_URL,
        "AccountReference":  account_reference,
        "TransactionDesc":   "Room booking payment",
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        response.raise_for_status()
        return response.json()


# 3. Reverse Transaction
# ⚠️ In sandbox this is simulated only — no real money moves.
async def reverse_transaction(
    transaction_id: str,
    amount: int,
    phone_number: str,
) -> dict:
    token = await get_access_token()

    payload = {
        "Initiator":              "testapi",
        "SecurityCredential":     SECURITY_CREDENTIAL,
        "CommandID":              "TransactionReversal",
        "TransactionID":          transaction_id,
        "Amount":                 amount,
        "ReceiverParty":          SHORTCODE,
        "ReceiverIdentifierType": "4",
        "ResultURL":              CALLBACK_URL,
        "QueueTimeOutURL":        CALLBACK_URL,
        "Remarks":                "Refund for cancelled booking",
        "Occasion":               "BookingRefund",
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/mpesa/reversal/v1/request",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        response.raise_for_status()
        return response.json()