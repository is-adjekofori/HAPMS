-- Wipes all hall/room/session state while keeping users, asset_types, and
-- hall_asset_rules intact. Deletion order follows the FK dependency graph
-- (children before parents); FK checks disabled around it purely so
-- TRUNCATE (which resets AUTO_INCREMENT) can run without ordering errors.
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE audit_logs;
TRUNCATE TABLE verification_items;
TRUNCATE TABLE session_end_verifications;
TRUNCATE TABLE condition_reports;
TRUNCATE TABLE sign_offs;
TRUNCATE TABLE baseline_items;
TRUNCATE TABLE room_inventory_baselines;
TRUNCATE TABLE student_room_allocations;
TRUNCATE TABLE porter_room_assignments;
TRUNCATE TABLE sessions;
TRUNCATE TABLE rooms;
TRUNCATE TABLE halls;

SET FOREIGN_KEY_CHECKS = 1;
