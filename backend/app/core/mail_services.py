from brevo import AsyncBrevo
from brevo.transactional_emails import SendTransacEmailRequestSender, SendTransacEmailRequestToItem

class MailService:
    def __init__(self, api_key: str, sender_email: str, sender_name: str = "LUStay"):
        self.client = AsyncBrevo(api_key=api_key)
        self.sender = SendTransacEmailRequestSender(
            name=sender_name,
            email=sender_email,
        )

    async def send_email(self, to_email: str, subject: str, html_content: str, to_name: str = "") -> bool:
        try:
            result = await self.client.transactional_emails.send_transac_email(
                subject=subject,
                html_content=html_content,
                sender=self.sender,
                to=[SendTransacEmailRequestToItem(email=to_email, name=to_name)],
            )
            print("Email sent. Message ID:", result.message_id)
            return True
        except Exception as e:
            print(f"Error sending email: {e}")
            return False