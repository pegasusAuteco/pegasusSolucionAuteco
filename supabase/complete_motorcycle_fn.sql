-- ============================================================
-- RPC Function: complete_motorcycle
-- ============================================================
-- Atomically moves a row from 'motorcycles' into
-- 'motorcycles_completed'. Both the INSERT and the DELETE
-- happen inside a single transaction so no record is ever
-- lost or duplicated.
--
-- Called from the backend via: client.rpc('complete_motorcycle', ...)
-- Run in: Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION complete_motorcycle(p_motorcycle_id UUID)
RETURNS motorcycles_completed
LANGUAGE plpgsql
AS $$
DECLARE
    v_moto     motorcycles%ROWTYPE;
    v_result   motorcycles_completed;
BEGIN
    -- Lock the source row to prevent concurrent completion of the same record.
    SELECT * INTO v_moto
    FROM motorcycles
    WHERE id = p_motorcycle_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Motorcycle % not found or already completed', p_motorcycle_id
            USING ERRCODE = 'P0002';
    END IF;

    -- Copy all columns into the archive table.
    -- completed_at defaults to NOW(); whatsapp_sent defaults to FALSE.
    INSERT INTO motorcycles_completed (
        id,
        client_name,
        client_id,
        phone,
        email,
        model,
        plate,
        mileage,
        observations,
        entry_date,
        status
    ) VALUES (
        v_moto.id,
        v_moto.client_name,
        v_moto.client_id,
        v_moto.phone,
        v_moto.email,
        v_moto.model,
        v_moto.plate,
        v_moto.mileage,
        v_moto.observations,
        v_moto.entry_date,
        'completed'
    )
    RETURNING * INTO v_result;

    -- Remove the original row only after the archive insert succeeds.
    DELETE FROM motorcycles WHERE id = p_motorcycle_id;

    RETURN v_result;
END;
$$;
