import logging

from vector_store.supabase_client import get_supabase
from workshop.schemas import MotorcycleCompletedResponse

logger = logging.getLogger(__name__)


# ── WorkshopService ───────────────────────────────────────────────────────────
# Handles motorcycle lifecycle operations against Supabase.
# Uses the service_role key (via get_supabase) which bypasses RLS.
class WorkshopService:

    # ── complete_motorcycle ───────────────────────────────────────────────────
    # Calls the complete_motorcycle PostgreSQL function via Supabase RPC.
    # The function atomically INSERTs into motorcycles_completed and
    # DELETEs from motorcycles — both in one transaction.
    # Raises ValueError when the motorcycle is not found (P0002 from Postgres).
    # Raises RuntimeError on any other unexpected Supabase error.
    async def complete_motorcycle(self, motorcycle_id: str) -> MotorcycleCompletedResponse:
        client = get_supabase()
        try:
            response = client.rpc(
                "complete_motorcycle",
                {"p_motorcycle_id": motorcycle_id},
            ).execute()
        except Exception as exc:
            error_msg = str(exc)
            # P0002 is the SQLSTATE raised by the function when the row is not found.
            if "P0002" in error_msg or "not found" in error_msg.lower():
                raise ValueError(f"Moto {motorcycle_id} no encontrada o ya completada")
            logger.exception("Unexpected error calling complete_motorcycle RPC")
            raise RuntimeError("Error interno al completar la moto") from exc

        if not response.data:
            raise ValueError(f"Moto {motorcycle_id} no encontrada o ya completada")

        # PostgREST may return a single composite type as a dict or as a one-element
        # list depending on the server configuration. Handle both shapes.
        row = response.data
        if isinstance(row, list):
            if not row:
                raise ValueError(f"Moto {motorcycle_id} no encontrada o ya completada")
            row = row[0]

        return MotorcycleCompletedResponse(**row)
