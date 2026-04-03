-- Demo data for ticketing system
-- Run AFTER migration 064

INSERT INTO tickets (ticket_number, project_id, category, subcategory, priority, source, title, description, status, assigned_to, assigned_team, reported_by, sla_response_hours, sla_resolution_hours, first_response_at, org_id, created_at) VALUES
('TKT-20260328-001', 'PROJ-29431', 'service', 'panel_damage', 'high', 'field_report', 'Cracked panel discovered during inspection', 'Panel B7 on south-facing array has a visible crack running diagonally. Likely from hail damage during March 15 storm. Production drop of ~3% observed on monitoring.', 'in_progress', 'Gregory Kelsch', 'Operations', 'Field Crew', 12, 48, NOW() - INTERVAL '4 hours', 'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '3 days'),

('TKT-20260329-001', 'PROJ-30102', 'sales', 'misrepresentation', 'urgent', 'customer_call', 'Customer claims rep promised 100% offset', 'Homeowner says sales rep Shannon Blake guaranteed their system would cover 100% of electricity usage. Actual design covers ~78%. Customer threatening BBB complaint and demanding system upgrade at no cost.', 'escalated', 'Zach Hall', 'Sales', 'Customer: James Wright', 4, 24, NOW() - INTERVAL '6 hours', 'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '2 days'),

('TKT-20260330-001', 'PROJ-28692', 'permitting', 'inspection_failure', 'high', 'internal', 'Failed city electrical inspection — grounding issue', 'Inspector flagged improper grounding on main service panel. Need to schedule re-inspection after fix. City permit office requires correction within 30 days or permit expires.', 'assigned', 'Marlie White', 'Operations', 'PM: Gregory', 8, 48, NOW() - INTERVAL '2 hours', 'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '1 day'),

('TKT-20260330-002', 'PROJ-30313', 'installation', 'equipment_missing', 'high', 'field_report', 'Missing monitoring gateway from NewCo delivery', 'Duracell Monitoring Gateway (PC-PRO-RGM-W2-BA-L) was on PO-20260325-001 but not in the delivery. Crew on site waiting. Need emergency shipment or pull from warehouse.', 'waiting_on_vendor', 'Manny Cruz', 'Operations', 'Install Crew Lead', 8, 24, NOW() - INTERVAL '1 hour', 'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '12 hours'),

('TKT-20260331-001', 'PROJ-29919', 'warranty', 'equipment_defect', 'normal', 'customer_email', 'Inverter showing error code E-031 intermittently', 'Customer reports SolarEdge inverter displaying error E-031 (DC voltage too high) 2-3 times per week. System shuts down for ~30 min each time. Under warranty — need to file claim with SolarEdge.', 'open', NULL, 'Service', 'Customer: Emmi Kirschvink', 24, 72, NULL, 'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '6 hours'),

('TKT-20260331-002', NULL, 'billing', 'funding_delay', 'normal', 'internal', 'Thrive M2 funding batch delayed — 12 projects affected', 'Thrive has not processed the March M2 batch. 12 projects with install complete dates in February still showing "Submitted". Finance team has escalated to Thrive account rep. Expected resolution: April 3.', 'in_progress', 'Marlie White', 'Finance', 'Finance Team', 48, 168, NOW() - INTERVAL '24 hours', 'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '2 days'),

('TKT-20260325-001', 'PROJ-30208', 'service', 'roof_leak', 'urgent', 'customer_call', 'Water intrusion after heavy rain — possible flashing issue', 'Customer Sashidhar Parayitham reports water stain on ceiling directly below roof penetration. Emergency service call dispatched. Possible failed boot flashing around conduit penetration.', 'resolved', 'Gregory Kelsch', 'Service', 'Customer: Sashidhar', 4, 24, NOW() - INTERVAL '5 days 2 hours', 'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '6 days'),

('TKT-20260320-001', 'PROJ-29348', 'design', 'redesign_needed', 'normal', 'internal', 'Redesign needed — tree growth blocking south array', 'Annual review shows significant tree growth on neighbor property blocking ~20% of south-facing panels from 2-5PM. Recommend redesign with panel relocation to west-facing roof or tree removal coordination.', 'resolved', 'Gregory Kelsch', 'Engineering', 'PM: Shirley Thiem', 24, 72, NOW() - INTERVAL '10 days', 'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '11 days'),

('TKT-20260315-001', 'PROJ-30123', 'sales', 'contract_dispute', 'high', 'customer_email', 'Customer disputing adder charges on final invoice', 'Customer Idris Kashif says they were not informed about the $2,500 in adders (critter guard + EV charger). Requesting copies of signed addendum. Sales rep Aaron Quesada claims verbal approval was given.', 'closed', 'Zach Hall', 'Sales', 'Customer: Idris Kashif', 12, 72, NOW() - INTERVAL '15 days', 'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '16 days'),

('TKT-20260331-003', 'PROJ-28692', 'service', 'monitoring_offline', 'normal', 'internal', 'System offline on monitoring platform for 5 days', 'Earl Anderson system not reporting to SolarEdge monitoring since March 26. WiFi issue suspected. Customer unresponsive to calls. Need to schedule site visit.', 'open', NULL, NULL, 'Monitoring Alert', 24, 48, NULL, 'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '3 hours');

-- Update resolved tickets with resolution info
UPDATE tickets SET resolution_category = 'fixed', resolution_notes = 'Replaced boot flashing and applied additional sealant. Roof leak test passed. Customer confirmed no further water intrusion after 48 hours.', resolved_at = NOW() - INTERVAL '4 days' WHERE ticket_number = 'TKT-20260325-001';
UPDATE tickets SET resolution_category = 'redesigned', resolution_notes = 'Relocated 8 panels from south to west-facing roof. New design approved by customer. Production estimate: -5% annual but eliminates shading losses.', resolved_at = NOW() - INTERVAL '5 days' WHERE ticket_number = 'TKT-20260320-001';
UPDATE tickets SET resolution_category = 'refunded', resolution_notes = 'Removed EV charger adder ($1,800) per management approval. Critter guard charge ($700) stands — documented in signed contract. Customer satisfied with resolution.', resolved_at = NOW() - INTERVAL '10 days', closed_at = NOW() - INTERVAL '9 days' WHERE ticket_number = 'TKT-20260315-001';

-- Add comments to make tickets look real
INSERT INTO ticket_comments (ticket_id, author, message, is_internal, created_at)
SELECT id, 'Gregory Kelsch', 'Dispatched crew to inspect panel damage. Will assess if warranty claim is viable or if insurance claim needed for hail damage.', false, NOW() - INTERVAL '2 days 20 hours'
FROM tickets WHERE ticket_number = 'TKT-20260328-001';

INSERT INTO ticket_comments (ticket_id, author, message, is_internal, created_at)
SELECT id, 'Install Crew', 'Confirmed crack is ~8 inches, runs from edge to center. Panel still producing but degraded. Photos uploaded to Drive.', false, NOW() - INTERVAL '2 days 16 hours'
FROM tickets WHERE ticket_number = 'TKT-20260328-001';

INSERT INTO ticket_comments (ticket_id, author, message, is_internal, created_at)
SELECT id, 'Zach Hall', 'Pulled the sales recording. Rep did say "designed to cover your full usage" but also mentioned "based on current consumption." Reviewing with legal.', true, NOW() - INTERVAL '1 day 18 hours'
FROM tickets WHERE ticket_number = 'TKT-20260329-001';

INSERT INTO ticket_comments (ticket_id, author, message, is_internal, created_at)
SELECT id, 'Zach Hall', 'Spoke with customer. Offered to add 4 panels at cost to bring coverage to 95%. Customer considering — will call back by Friday.', false, NOW() - INTERVAL '1 day 2 hours'
FROM tickets WHERE ticket_number = 'TKT-20260329-001';

INSERT INTO ticket_comments (ticket_id, author, message, is_internal, created_at)
SELECT id, 'Manny Cruz', 'Called NewCo — they confirmed gateway was backordered and shipped separately. Tracking: UPS-1Z447722. ETA tomorrow.', false, NOW() - INTERVAL '8 hours'
FROM tickets WHERE ticket_number = 'TKT-20260330-002';

INSERT INTO ticket_comments (ticket_id, author, message, is_internal, created_at)
SELECT id, 'Marlie White', 'Thrive confirmed batch will process April 3. All 12 projects will fund simultaneously. No action needed from our side.', false, NOW() - INTERVAL '12 hours'
FROM tickets WHERE ticket_number = 'TKT-20260331-002';

-- Add history entries
INSERT INTO ticket_history (ticket_id, field, old_value, new_value, changed_by, created_at)
SELECT id, 'status', 'open', 'assigned', 'Gregory Kelsch', NOW() - INTERVAL '2 days 22 hours'
FROM tickets WHERE ticket_number = 'TKT-20260328-001';

INSERT INTO ticket_history (ticket_id, field, old_value, new_value, changed_by, created_at)
SELECT id, 'status', 'assigned', 'in_progress', 'Gregory Kelsch', NOW() - INTERVAL '2 days 20 hours'
FROM tickets WHERE ticket_number = 'TKT-20260328-001';

INSERT INTO ticket_history (ticket_id, field, old_value, new_value, changed_by, created_at)
SELECT id, 'status', 'open', 'escalated', 'Zach Hall', NOW() - INTERVAL '1 day 20 hours'
FROM tickets WHERE ticket_number = 'TKT-20260329-001';

INSERT INTO ticket_history (ticket_id, field, old_value, new_value, changed_by, created_at)
SELECT id, 'priority', 'high', 'urgent', 'Zach Hall', NOW() - INTERVAL '1 day 20 hours'
FROM tickets WHERE ticket_number = 'TKT-20260329-001';
