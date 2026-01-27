from app.db.supabase import get_supabase_service_client

class NotificationService:
    def __init__(self):
        self.supabase = get_supabase_service_client()

    def create(self, user_id: str, title: str, message: str, type: str = "info"):
        """
        Create a notification for a specific user.
        """
        try:
            data = {
                "user_id": user_id,
                "title": title,
                "message": message,
                "type": type,
                "read": False
            }
            # Fire and forget mostly, but we raise if catastrophic
            self.supabase.table("notifications").insert(data).execute()
        except Exception as e:
            print(f"Failed to create notification: {e}")
