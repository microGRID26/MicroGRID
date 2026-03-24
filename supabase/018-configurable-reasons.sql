-- 018-configurable-reasons.sql — Configurable task reasons
-- Moves Pending Resolution / Revision Required reasons to database

CREATE TABLE IF NOT EXISTS public.task_reasons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id TEXT NOT NULL,
  reason_type TEXT NOT NULL CHECK (reason_type IN ('pending', 'revision')),
  reason TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_reasons_task_id ON public.task_reasons (task_id);
CREATE INDEX IF NOT EXISTS idx_task_reasons_type ON public.task_reasons (reason_type);
CREATE INDEX IF NOT EXISTS idx_task_reasons_active ON public.task_reasons (active) WHERE active = true;

-- RLS
ALTER TABLE public.task_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_reasons_select" ON public.task_reasons
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "task_reasons_insert" ON public.task_reasons
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "task_reasons_update" ON public.task_reasons
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "task_reasons_delete" ON public.task_reasons
  FOR DELETE TO authenticated USING (auth_is_super_admin());

-- ══════════════════════════════════════════════════════════════════════════════
-- SEED: Pending Resolution reasons (keyed by task_id)
-- ══════════════════════════════════════════════════════════════════════════════

-- welcome
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('welcome', 'pending', 'Credit Declined', 0),
  ('welcome', 'pending', 'Customer Unresponsive', 1),
  ('welcome', 'pending', 'EC Has Not Completed the Lead', 2),
  ('welcome', 'pending', 'H/O Requested Another Time', 3),
  ('welcome', 'pending', 'IA Not Signed', 4),
  ('welcome', 'pending', 'Invalid ACH Information', 5),
  ('welcome', 'pending', 'LA Not Signed', 6),
  ('welcome', 'pending', 'Need to Change Lenders', 7),
  ('welcome', 'pending', 'No Lender Yet', 8),
  ('welcome', 'pending', 'Pending Cancellation', 9),
  ('welcome', 'pending', 'Welcome Checklist/Call Not Completed', 10);

-- ia
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('ia', 'pending', 'Incorrect Adders', 0),
  ('ia', 'pending', 'Incorrect Email', 1),
  ('ia', 'pending', 'Incorrect Name', 2),
  ('ia', 'pending', 'Incorrect Phone', 3),
  ('ia', 'pending', 'Incorrect Price', 4),
  ('ia', 'pending', 'Incorrect Site Address', 5),
  ('ia', 'pending', 'Incorrect System Data', 6),
  ('ia', 'pending', 'Missing Adder', 7),
  ('ia', 'pending', 'Missing Document', 8),
  ('ia', 'pending', 'Missing Information', 9),
  ('ia', 'pending', 'Missing Promise', 10),
  ('ia', 'pending', 'Not Signed', 11);

-- ub
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('ub', 'pending', 'Document Not Found', 0),
  ('ub', 'pending', 'Missing Account #', 1),
  ('ub', 'pending', 'Missing Customer Name', 2),
  ('ub', 'pending', 'Missing ESID', 3),
  ('ub', 'pending', 'Missing Meter #', 4),
  ('ub', 'pending', 'Missing Service Address', 5),
  ('ub', 'pending', 'Missing Utility Company Name', 6),
  ('ub', 'pending', 'Not Current', 7),
  ('ub', 'pending', 'Not Readable', 8);

-- sched_survey
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('sched_survey', 'pending', 'Awaiting Customer Reply', 0),
  ('sched_survey', 'pending', 'Customer Wants to Wait', 1),
  ('sched_survey', 'pending', 'Scheduling Conflict', 2);

-- ntp
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('ntp', 'pending', 'IA Resign', 0),
  ('ntp', 'pending', 'Missing Utility Bill', 1),
  ('ntp', 'pending', 'Need ACH Information', 2),
  ('ntp', 'pending', 'Need Drivers License / ID', 3),
  ('ntp', 'pending', 'Need Income Verification', 4),
  ('ntp', 'pending', 'Need Property Ownership', 5),
  ('ntp', 'pending', 'NTP Not Granted', 6),
  ('ntp', 'pending', 'NTP Requires Other', 7),
  ('ntp', 'pending', 'Pending HCO', 8),
  ('ntp', 'pending', 'Pending NCCO', 9),
  ('ntp', 'pending', 'Requires Shade Study and Plan Set', 10),
  ('ntp', 'pending', 'Title Stip', 11);

-- site_survey
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('site_survey', 'pending', 'Customer Requested', 0),
  ('site_survey', 'pending', 'Invalid ACH Information', 1),
  ('site_survey', 'pending', 'Requires Secondary Site Survey', 2),
  ('site_survey', 'pending', 'Rescheduled', 3),
  ('site_survey', 'pending', 'Structural/Electrical Incomplete', 4);

-- survey_review
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('survey_review', 'pending', 'Extended Scope of Work - Asbestos', 0),
  ('survey_review', 'pending', 'Extended Scope of Work - Electrical', 1),
  ('survey_review', 'pending', 'Extended Scope of Work - Structural', 2),
  ('survey_review', 'pending', 'Missing Attic Pics', 3),
  ('survey_review', 'pending', 'Missing Documents', 4),
  ('survey_review', 'pending', 'Missing Drone Pics', 5),
  ('survey_review', 'pending', 'Missing Electrical Pics', 6),
  ('survey_review', 'pending', 'Missing Roof Pics', 7),
  ('survey_review', 'pending', 'MPU Review', 8),
  ('survey_review', 'pending', 'Pending DQ', 9),
  ('survey_review', 'pending', 'Requires Secondary Site Survey', 10),
  ('survey_review', 'pending', 'Roof Review Needed', 11),
  ('survey_review', 'pending', 'Utility Bill Rejection', 12),
  ('survey_review', 'pending', 'Waiting for AHJ/Utility', 13);

-- build_design
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('build_design', 'pending', 'Extended Scope of Work - Asbestos', 0),
  ('build_design', 'pending', 'Extended Scope of Work - Electrical', 1),
  ('build_design', 'pending', 'Extended Scope of Work - Structural', 2),
  ('build_design', 'pending', 'Missing Adder', 3),
  ('build_design', 'pending', 'MPU Review', 4),
  ('build_design', 'pending', 'Pending DQ', 5),
  ('build_design', 'pending', 'Requires Missing Document Upload', 6),
  ('build_design', 'pending', 'Requires Photo Re-upload', 7),
  ('build_design', 'pending', 'Requires Secondary Site Survey', 8),
  ('build_design', 'pending', 'Requires Table Discussion', 9),
  ('build_design', 'pending', 'Utility Bill Rejection', 10);

-- scope
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('scope', 'pending', 'Extended Scope of Work - Electrical', 0),
  ('scope', 'pending', 'Extended Scope of Work - Structural', 1),
  ('scope', 'pending', 'Pending Approval', 2),
  ('scope', 'pending', 'Requires Missing Document Upload', 3),
  ('scope', 'pending', 'Requires Photo Re-upload', 4),
  ('scope', 'pending', 'Requires Secondary Site Survey', 5),
  ('scope', 'pending', 'Requires Table Discussion', 6),
  ('scope', 'pending', 'Reroof Required', 7);

-- build_eng
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('build_eng', 'pending', 'Battery Review', 0),
  ('build_eng', 'pending', 'Escalated', 1),
  ('build_eng', 'pending', 'ESID #', 2),
  ('build_eng', 'pending', 'Extended Scope of Work - Electrical', 3),
  ('build_eng', 'pending', 'Extended Scope of Work - Structural', 4),
  ('build_eng', 'pending', 'Internal Battery Check', 5),
  ('build_eng', 'pending', 'Utility Bill Rejection', 6),
  ('build_eng', 'pending', 'Waiting for Confirmation', 7);

-- eng_approval
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('eng_approval', 'pending', 'Battery Review', 0),
  ('eng_approval', 'pending', 'Extended Scope of Work - Electrical', 1),
  ('eng_approval', 'pending', 'Extended Scope of Work - Structural', 2),
  ('eng_approval', 'pending', 'Internal Battery Checking', 3),
  ('eng_approval', 'pending', 'Missing Document', 4),
  ('eng_approval', 'pending', 'Missing Photos', 5),
  ('eng_approval', 'pending', 'Pending Cancellation', 6),
  ('eng_approval', 'pending', 'Pending DQ', 7),
  ('eng_approval', 'pending', 'Sent for Stamps', 8),
  ('eng_approval', 'pending', 'Stamps Required', 9);

-- stamps
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('stamps', 'pending', 'Electrical DQ', 0),
  ('stamps', 'pending', 'Missing Document', 1),
  ('stamps', 'pending', 'Pending EC or Homeowner', 2),
  ('stamps', 'pending', 'Pending Site Survey Photos', 3),
  ('stamps', 'pending', 'Pending Stamps', 4),
  ('stamps', 'pending', 'Structural DQ', 5);

-- prod_add
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('prod_add', 'pending', 'Production Addendum Sent', 0);

-- new_ia
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('new_ia', 'pending', 'Awaiting Customer Reply', 0),
  ('new_ia', 'pending', 'Awaiting Dealer Reply', 1),
  ('new_ia', 'pending', 'IA Not Signed', 2);

-- reroof
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('reroof', 'pending', 'Awaiting Change Order', 0),
  ('reroof', 'pending', 'Awaiting Discovery', 1),
  ('reroof', 'pending', 'Getting Estimate', 2),
  ('reroof', 'pending', 'Locating Vendor', 3),
  ('reroof', 'pending', 'Onboarding Vendor', 4);

-- onsite_redesign
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('onsite_redesign', 'pending', 'Awaiting Customer Reply', 0),
  ('onsite_redesign', 'pending', 'Missing Signature', 1);

-- hoa
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('hoa', 'pending', 'Awaiting Application Receipt Confirmation', 0),
  ('hoa', 'pending', 'Awaiting Customer Reply', 1),
  ('hoa', 'pending', 'Awaiting EC Reply', 2),
  ('hoa', 'pending', 'Awaiting HOA Prep Completion', 3),
  ('hoa', 'pending', 'Awaiting HOA Reply', 4),
  ('hoa', 'pending', 'City Permit Required', 5),
  ('hoa', 'pending', 'Engineering Stamp Required', 6),
  ('hoa', 'pending', 'Fee Receipt Confirmation Required', 7),
  ('hoa', 'pending', 'Fee Required', 8),
  ('hoa', 'pending', 'HOA Denial Attention Required', 9),
  ('hoa', 'pending', 'HOA Escalation', 10),
  ('hoa', 'pending', 'Legal Escalation Required', 11),
  ('hoa', 'pending', 'Lot Survey with Panel Placement Required', 12),
  ('hoa', 'pending', 'Missing Neighbor Signatures', 13),
  ('hoa', 'pending', 'More Information Required by HOA', 14),
  ('hoa', 'pending', 'Need 10% Design/Letter', 15),
  ('hoa', 'pending', 'Need Customer to Submit to HOA', 16),
  ('hoa', 'pending', 'PV Watts/NREL Calculations Required', 17),
  ('hoa', 'pending', 'Specific HOA Document Required', 18);

-- city_permit
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('city_permit', 'pending', 'City Registration Need/Sent/Pending', 0),
  ('city_permit', 'pending', 'Customer Requesting Design Change', 1),
  ('city_permit', 'pending', 'EC/Customer Concerns', 2),
  ('city_permit', 'pending', 'Licensing/Compliance', 3),
  ('city_permit', 'pending', 'Objection Letter', 4),
  ('city_permit', 'pending', 'Open Permits/Pending Inspection', 5),
  ('city_permit', 'pending', 'Pending Cancellation', 6),
  ('city_permit', 'pending', 'Pending Customer Signature', 7),
  ('city_permit', 'pending', 'Pending Deed/Proof of Ownership', 8),
  ('city_permit', 'pending', 'Pending Engineer Stamped Plans', 9),
  ('city_permit', 'pending', 'Pending Engineering Revision', 10),
  ('city_permit', 'pending', 'Pending HOA Approval', 11),
  ('city_permit', 'pending', 'Pending Homeowner Authorization/Action', 12),
  ('city_permit', 'pending', 'Pending Utility Approval First', 13),
  ('city_permit', 'pending', 'Pending WPI Documents', 14),
  ('city_permit', 'pending', 'Permit Drop Off/Pickup', 15),
  ('city_permit', 'pending', 'Previous Unpaid Permits', 16),
  ('city_permit', 'pending', 'Unpaid Property Taxes', 17);

-- util_permit
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('util_permit', 'pending', 'Customer Authorization', 0),
  ('util_permit', 'pending', 'Customer Requesting Design Change', 1),
  ('util_permit', 'pending', 'Duplicate Under Review', 2),
  ('util_permit', 'pending', 'EC/Customer Concerns', 3),
  ('util_permit', 'pending', 'Licensing/Compliance', 4),
  ('util_permit', 'pending', 'Missing Site Survey Photos', 5),
  ('util_permit', 'pending', 'Open Permits/Pending Inspection', 6),
  ('util_permit', 'pending', 'Pending Cancellation', 7),
  ('util_permit', 'pending', 'Pending City Registration', 8),
  ('util_permit', 'pending', 'Pending City Reply', 9),
  ('util_permit', 'pending', 'Pending CPS Signed Documents', 10),
  ('util_permit', 'pending', 'Pending Customer Signature', 11),
  ('util_permit', 'pending', 'Pending Deed/Proof of Ownership', 12),
  ('util_permit', 'pending', 'Pending Engineer Stamped Plans', 13),
  ('util_permit', 'pending', 'Pending Engineering Revision', 14),
  ('util_permit', 'pending', 'Pending HOA Approval', 15),
  ('util_permit', 'pending', 'Pending ICA and PTO for Existing System', 16),
  ('util_permit', 'pending', 'Pending Proof of Insurance', 17),
  ('util_permit', 'pending', 'Pending Utility Approval (No Objection Letter)', 18),
  ('util_permit', 'pending', 'Pending Utility Availability', 19),
  ('util_permit', 'pending', 'Pending Utility Bill/Account Information', 20),
  ('util_permit', 'pending', 'Pending Utility Reply', 21),
  ('util_permit', 'pending', 'Pending WPI Documents', 22),
  ('util_permit', 'pending', 'Permit Drop Off/Pick-Up', 23),
  ('util_permit', 'pending', 'Previous Unpaid Permits', 24);

-- checkpoint1
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('checkpoint1', 'pending', 'Asbestos Removal/Restoration', 0),
  ('checkpoint1', 'pending', 'Awaiting Field Ops', 1),
  ('checkpoint1', 'pending', 'Contract Issue - Addendum Not Signed', 2),
  ('checkpoint1', 'pending', 'Contract Issue - Agreements Mismatch', 3),
  ('checkpoint1', 'pending', 'Contract Issue - Unsigned Docs', 4),
  ('checkpoint1', 'pending', 'Credit Expired', 5),
  ('checkpoint1', 'pending', 'Engineering/IA Mismatch', 6),
  ('checkpoint1', 'pending', 'Homeowner Request Wait or Cancel', 7),
  ('checkpoint1', 'pending', 'Inventory - Battery Shortage', 8),
  ('checkpoint1', 'pending', 'Inventory - Inverter Shortage', 9),
  ('checkpoint1', 'pending', 'Inventory - Module Shortage', 10),
  ('checkpoint1', 'pending', 'Inventory - Racking Shortage', 11),
  ('checkpoint1', 'pending', 'Legal', 12),
  ('checkpoint1', 'pending', 'Need Design Revision', 13),
  ('checkpoint1', 'pending', 'Need Engineering Revision', 14),
  ('checkpoint1', 'pending', 'Need HOA Approval', 15),
  ('checkpoint1', 'pending', 'Need New IA', 16),
  ('checkpoint1', 'pending', 'Need Reroof', 17),
  ('checkpoint1', 'pending', 'NTP Not Granted', 18),
  ('checkpoint1', 'pending', 'Pending HCO', 19),
  ('checkpoint1', 'pending', 'Pending NCCO', 20),
  ('checkpoint1', 'pending', 'Pending Paykeeper Deposit', 21),
  ('checkpoint1', 'pending', 'Pending Permit Approval per Requirement', 22),
  ('checkpoint1', 'pending', 'Pending Reroof Cure', 23),
  ('checkpoint1', 'pending', 'Pending Roof Completion', 24),
  ('checkpoint1', 'pending', 'Pending Utility Outage', 25),
  ('checkpoint1', 'pending', 'Production Addendum Required', 26),
  ('checkpoint1', 'pending', 'Reroof Discovered', 27);

-- sched_install
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('sched_install', 'pending', 'Awaiting Customer Reply', 0),
  ('sched_install', 'pending', 'Crew Availability', 1),
  ('sched_install', 'pending', 'Customer Wants to Wait', 2),
  ('sched_install', 'pending', 'Pending Cancellation', 3),
  ('sched_install', 'pending', 'Pending Equipment', 4),
  ('sched_install', 'pending', 'Pending Permit Approval', 5);

-- inventory
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('inventory', 'pending', 'Equipment Ordered', 0),
  ('inventory', 'pending', 'Equipment Shortage', 1),
  ('inventory', 'pending', 'Inventory Ordered', 2),
  ('inventory', 'pending', 'Inventory Shortage', 3);

-- insp_review
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('insp_review', 'pending', 'City Permit Approval Pending', 0),
  ('insp_review', 'pending', 'City Permit Update Needed', 1),
  ('insp_review', 'pending', 'Design Update Needed', 2),
  ('insp_review', 'pending', 'Engineering Update Needed', 3),
  ('insp_review', 'pending', 'Gen 2 Duracell', 4),
  ('insp_review', 'pending', 'Legal', 5),
  ('insp_review', 'pending', 'Pending Solrite Subcontractor Completion', 6),
  ('insp_review', 'pending', 'Pending Sonnen Battery Commissioning', 7),
  ('insp_review', 'pending', 'Service Needed', 8),
  ('insp_review', 'pending', 'Utility Permit Approval Pending', 9),
  ('insp_review', 'pending', 'Utility Permit Update Needed', 10);

-- sched_city
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('sched_city', 'pending', 'Awaiting City Reply', 0),
  ('sched_city', 'pending', 'Awaiting Customer Reply', 1),
  ('sched_city', 'pending', 'Customer Escalation', 2),
  ('sched_city', 'pending', 'Install is Incomplete', 3),
  ('sched_city', 'pending', 'Legal', 4),
  ('sched_city', 'pending', 'Licensing/Compliance', 5),
  ('sched_city', 'pending', 'Pending Cancellation', 6),
  ('sched_city', 'pending', 'Pending City Availability', 7),
  ('sched_city', 'pending', 'Pending Crew Availability', 8),
  ('sched_city', 'pending', 'Pending Engineering', 9),
  ('sched_city', 'pending', 'Pending Homeowner Availability', 10),
  ('sched_city', 'pending', 'Pending Inspection Corrections', 11),
  ('sched_city', 'pending', 'Pending Permit Approval', 12),
  ('sched_city', 'pending', 'Pending Permit Revision', 13),
  ('sched_city', 'pending', 'Pending Post Install Letter', 14),
  ('sched_city', 'pending', 'Pending QC', 15),
  ('sched_city', 'pending', 'Pending Service', 16),
  ('sched_city', 'pending', 'Pending WPI8', 17);

-- sched_util
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('sched_util', 'pending', 'Awaiting City Reply', 0),
  ('sched_util', 'pending', 'Awaiting Customer Reply', 1),
  ('sched_util', 'pending', 'Awaiting Utility Reply', 2),
  ('sched_util', 'pending', 'Install is Incomplete', 3),
  ('sched_util', 'pending', 'Legal', 4),
  ('sched_util', 'pending', 'Licensing/Compliance', 5),
  ('sched_util', 'pending', 'Pending Cancellation', 6),
  ('sched_util', 'pending', 'Pending City Approval First', 7),
  ('sched_util', 'pending', 'Pending Crew Availability', 8),
  ('sched_util', 'pending', 'Pending Customer Signature', 9),
  ('sched_util', 'pending', 'Pending Engineering', 10),
  ('sched_util', 'pending', 'Pending Homeowner Availability', 11),
  ('sched_util', 'pending', 'Pending Inspection Corrections', 12),
  ('sched_util', 'pending', 'Pending Permit Approval', 13),
  ('sched_util', 'pending', 'Pending QC', 14),
  ('sched_util', 'pending', 'Pending Service', 15),
  ('sched_util', 'pending', 'Pending SunRaise Release', 16),
  ('sched_util', 'pending', 'Pending Utility Approval', 17),
  ('sched_util', 'pending', 'Pending Utility Availability', 18);

-- city_insp
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('city_insp', 'pending', 'Awaiting City Reply', 0),
  ('city_insp', 'pending', 'Escalated to Customer Service', 1),
  ('city_insp', 'pending', 'Inspection Report Requested', 2),
  ('city_insp', 'pending', 'Pending Install', 3),
  ('city_insp', 'pending', 'Pending Utility Approval First', 4);

-- util_insp
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('util_insp', 'pending', 'Escalated to Customer Service', 0),
  ('util_insp', 'pending', 'Pending Customer Signature', 1),
  ('util_insp', 'pending', 'Pending Host Availability', 2),
  ('util_insp', 'pending', 'Pending Install', 3),
  ('util_insp', 'pending', 'Pending Meter Set', 4);

-- city_upd
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('city_upd', 'pending', 'Licensing/Compliance', 0),
  ('city_upd', 'pending', 'Need City Registration', 1),
  ('city_upd', 'pending', 'Need Customer Signature', 2),
  ('city_upd', 'pending', 'Need Deed/Proof of Ownership', 3),
  ('city_upd', 'pending', 'Need Engineer Stamped Plans', 4),
  ('city_upd', 'pending', 'Need Engineering Revision', 5),
  ('city_upd', 'pending', 'Need HOA Approval', 6),
  ('city_upd', 'pending', 'Need WPI Documents', 7),
  ('city_upd', 'pending', 'Objection Letter', 8),
  ('city_upd', 'pending', 'Open Permits/Pending Inspection', 9),
  ('city_upd', 'pending', 'Pending Utility Approval', 10),
  ('city_upd', 'pending', 'Permit Drop Off/Pickup', 11),
  ('city_upd', 'pending', 'Possible Dispositions', 12),
  ('city_upd', 'pending', 'Previous Unpaid Permits', 13);

-- util_upd
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('util_upd', 'pending', 'Need Customer Signature', 0),
  ('util_upd', 'pending', 'Need Proof of Insurance', 1),
  ('util_upd', 'pending', 'Pending Transformer Upgrade', 2),
  ('util_upd', 'pending', 'Transformer Upgrade Review', 3);

-- pto
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('pto', 'pending', 'Pending PTO Issuance', 0);

-- in_service
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('in_service', 'pending', 'Abnormal Grid', 0),
  ('in_service', 'pending', 'Awaiting Customer Reply', 1),
  ('in_service', 'pending', 'Awaiting RMA', 2),
  ('in_service', 'pending', 'Awaiting System Update To Take Effect', 3),
  ('in_service', 'pending', 'Battery Issues', 4),
  ('in_service', 'pending', 'CT Issues', 5),
  ('in_service', 'pending', 'Gateway/DTU Not Reporting', 6),
  ('in_service', 'pending', 'Meter Set', 7),
  ('in_service', 'pending', 'Production Issue/MNR', 8),
  ('in_service', 'pending', 'System Activation Incomplete', 9);

-- install_done (no pending reasons, only revision — handled in REVISION section below)

-- ══════════════════════════════════════════════════════════════════════════════
-- SEED: Revision Required reasons (keyed by stage, stored with stage as task_id)
-- ══════════════════════════════════════════════════════════════════════════════

-- evaluation
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('evaluation', 'revision', 'Incorrect Customer Info', 0),
  ('evaluation', 'revision', 'Need ACH Information', 1),
  ('evaluation', 'revision', 'Need Drivers License / ID', 2),
  ('evaluation', 'revision', 'Need Income Verification', 3),
  ('evaluation', 'revision', 'Need New IA', 4),
  ('evaluation', 'revision', 'Need New Loan Doc', 5),
  ('evaluation', 'revision', 'Need Property Ownership', 6),
  ('evaluation', 'revision', 'Plan Revision', 7),
  ('evaluation', 'revision', 'PPW Too High', 8),
  ('evaluation', 'revision', 'Rejected - Other', 9),
  ('evaluation', 'revision', 'Updated Shade Study Required', 10);

-- survey
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('survey', 'revision', 'Animals Present', 0),
  ('survey', 'revision', 'Customer Postponed', 1),
  ('survey', 'revision', 'Customer Request to Cancel', 2),
  ('survey', 'revision', 'Missing Attic Pics', 3),
  ('survey', 'revision', 'Missing Drone Pics', 4),
  ('survey', 'revision', 'Missing Electrical Pics', 5),
  ('survey', 'revision', 'Missing Roof Pics', 6),
  ('survey', 'revision', 'Missing Site Pics', 7),
  ('survey', 'revision', 'Need Equipment', 8),
  ('survey', 'revision', 'No Access to Attic', 9),
  ('survey', 'revision', 'No Access to Site', 10),
  ('survey', 'revision', 'Reroof Procedure', 11);

-- design
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('design', 'revision', 'AHJ Correction', 0),
  ('design', 'revision', 'Attachment Change', 1),
  ('design', 'revision', 'Battery Addition', 2),
  ('design', 'revision', 'Confirmed DQ', 3),
  ('design', 'revision', 'Customer Request', 4),
  ('design', 'revision', 'Electrical Corrections', 5),
  ('design', 'revision', 'Engineering Audit', 6),
  ('design', 'revision', 'HOA Request', 7),
  ('design', 'revision', 'Layout Change', 8),
  ('design', 'revision', 'Lender Request', 9),
  ('design', 'revision', 'Missing Stamps/Letters', 10),
  ('design', 'revision', 'Need New IA DS', 11),
  ('design', 'revision', 'New Electrical Notes', 12),
  ('design', 'revision', 'Panel Count Change', 13),
  ('design', 'revision', 'Panel Type Change', 14),
  ('design', 'revision', 'Production Addendum Required', 15),
  ('design', 'revision', 'Reengineer – Customer Request', 16),
  ('design', 'revision', 'Requested Cancel', 17),
  ('design', 'revision', 'Supply Chain Issues', 18),
  ('design', 'revision', 'Utility Correction', 19),
  ('design', 'revision', 'Windspeed Change', 20);

-- permit
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('permit', 'revision', 'City Permit Revision', 0),
  ('permit', 'revision', 'CP1 - Need Reroof', 1),
  ('permit', 'revision', 'Incorrect / Missing Data on Plans', 2),
  ('permit', 'revision', 'Incorrect / Missing PV Labels', 3),
  ('permit', 'revision', 'Incorrect Adders', 4),
  ('permit', 'revision', 'Incorrect Email', 5),
  ('permit', 'revision', 'Incorrect Name', 6),
  ('permit', 'revision', 'Incorrect Permit Submitted', 7),
  ('permit', 'revision', 'Incorrect Phone', 8),
  ('permit', 'revision', 'Incorrect Price', 9),
  ('permit', 'revision', 'Incorrect Site Address', 10),
  ('permit', 'revision', 'Incorrect System Data', 11),
  ('permit', 'revision', 'Incorrect or No Setbacks', 12),
  ('permit', 'revision', 'Loan Doc Not Signed', 13),
  ('permit', 'revision', 'Missing Adder', 14),
  ('permit', 'revision', 'Missing Wind Cert Docs (WPI1/8)', 15),
  ('permit', 'revision', 'Need Engineering Revision', 16),
  ('permit', 'revision', 'Need New CPS Form', 17),
  ('permit', 'revision', 'Need New IA', 18),
  ('permit', 'revision', 'New NTP Required', 19),
  ('permit', 'revision', 'Pending City Approval', 20),
  ('permit', 'revision', 'Pending Stipulations', 21),
  ('permit', 'revision', 'Plan Revision', 22),
  ('permit', 'revision', 'Production Addendum Required', 23),
  ('permit', 'revision', 'Reroof Discovered', 24),
  ('permit', 'revision', 'Updated Shade Study Required', 25),
  ('permit', 'revision', 'Utility Permit Revision', 26),
  ('permit', 'revision', 'Workflow Cancelled', 27);

-- install
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('install', 'revision', 'AHJ Denied', 0),
  ('install', 'revision', 'City No-Show', 1),
  ('install', 'revision', 'Correction Needed (Specify in Comments)', 2),
  ('install', 'revision', 'Crew Not Available/Call-In', 3),
  ('install', 'revision', 'Customer Canceled', 4),
  ('install', 'revision', 'Customer Reschedule', 5),
  ('install', 'revision', 'Customer Unresponsive / Not Available', 6),
  ('install', 'revision', 'Disconnect/Reconnect', 7),
  ('install', 'revision', 'HOA Denied', 8),
  ('install', 'revision', 'Incident', 9),
  ('install', 'revision', 'Inspection Delay', 10),
  ('install', 'revision', 'Missing Material', 11),
  ('install', 'revision', 'Missing Photos', 12),
  ('install', 'revision', 'Need Reroof', 13),
  ('install', 'revision', 'OSR Required', 14),
  ('install', 'revision', 'Pending Battery Completion', 15),
  ('install', 'revision', 'Ran Out of Daylight', 16),
  ('install', 'revision', 'System Commissioning Error', 17),
  ('install', 'revision', 'TriSMART Reschedule', 18),
  ('install', 'revision', 'Utility No-Show', 19),
  ('install', 'revision', 'Waiting for HOA Approval', 20),
  ('install', 'revision', 'Weather', 21);

-- inspection
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('inspection', 'revision', 'AHJ Reschedule / Cancel', 0),
  ('inspection', 'revision', 'Battery Corrections Needed', 1),
  ('inspection', 'revision', 'City No-Show', 2),
  ('inspection', 'revision', 'Conduit Strapping', 3),
  ('inspection', 'revision', 'Correction Needed (Specify in Comments)', 4),
  ('inspection', 'revision', 'Crew Not Available / Call-In', 5),
  ('inspection', 'revision', 'Customer Canceled', 6),
  ('inspection', 'revision', 'Customer Issue (Previous Work / Existing Issue)', 7),
  ('inspection', 'revision', 'Customer Reschedule', 8),
  ('inspection', 'revision', 'Customer Unresponsive / Not Available', 9),
  ('inspection', 'revision', 'Electrical Wall Install Error', 10),
  ('inspection', 'revision', 'Grounding, Electrical Wall', 11),
  ('inspection', 'revision', 'Grounding, Roof', 12),
  ('inspection', 'revision', 'Incorrect / Missing Data on Plans', 13),
  ('inspection', 'revision', 'Incorrect / Missing PV Labels', 14),
  ('inspection', 'revision', 'Incorrect Equipment Installed', 15),
  ('inspection', 'revision', 'Incorrect Permit Submitted', 16),
  ('inspection', 'revision', 'Incorrect or No Setbacks', 17),
  ('inspection', 'revision', 'Install Not Matching Plans', 18),
  ('inspection', 'revision', 'LST/IPC Interconnection Not to Code', 19),
  ('inspection', 'revision', 'Microinverter(s) Not Reporting', 20),
  ('inspection', 'revision', 'Missing Barriers', 21),
  ('inspection', 'revision', 'Missing Documents on Site', 22),
  ('inspection', 'revision', 'Missing Equipment', 23),
  ('inspection', 'revision', 'Missing Homeowner / Gate Locked', 24),
  ('inspection', 'revision', 'Missing Host', 25),
  ('inspection', 'revision', 'Missing Material', 26),
  ('inspection', 'revision', 'Missing Photos', 27),
  ('inspection', 'revision', 'Missing Smoke Detectors', 28),
  ('inspection', 'revision', 'Missing Wind Cert Docs (WPI1/8)', 29),
  ('inspection', 'revision', 'New AHJ Requirement', 30),
  ('inspection', 'revision', 'Not Scheduled with AHJ', 31),
  ('inspection', 'revision', 'OSR Required', 32),
  ('inspection', 'revision', 'Pending Battery Completion', 33),
  ('inspection', 'revision', 'Ran Out of Daylight', 34),
  ('inspection', 'revision', 'Rejected - Need Engineer Stamped Plans', 35),
  ('inspection', 'revision', 'Rough Inspection Required', 36),
  ('inspection', 'revision', 'System Commissioning Error', 37),
  ('inspection', 'revision', 'Trench', 38),
  ('inspection', 'revision', 'TriSMART Rescheduled', 39),
  ('inspection', 'revision', 'Utility No-Show', 40),
  ('inspection', 'revision', 'Weather', 41),
  ('inspection', 'revision', 'Wire Management', 42),
  ('inspection', 'revision', 'Workmanship', 43);

-- complete
INSERT INTO public.task_reasons (task_id, reason_type, reason, sort_order) VALUES
  ('complete', 'revision', 'Need PTO Letter', 0),
  ('complete', 'revision', 'Needs to Reschedule', 1),
  ('complete', 'revision', 'Tech Required', 2);
