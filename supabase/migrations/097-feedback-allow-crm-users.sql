-- 097: Allow CRM/internal users to submit feedback (not just customers)
-- Zach (admin) hit "Couldn't send" because customer_account_id was NOT NULL
-- and only customer_accounts holders could INSERT.

-- Make customer_account_id nullable so CRM users without a customer account can submit
ALTER TABLE customer_feedback ALTER COLUMN customer_account_id DROP NOT NULL;

-- Track which auth user submitted (useful when customer_account_id is null)
ALTER TABLE customer_feedback ADD COLUMN IF NOT EXISTS submitted_by_user_id UUID;

-- Allow any authenticated user to INSERT feedback (CRM testers, admins, etc.)
CREATE POLICY cf_authenticated_insert ON customer_feedback
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to read their own submissions (by submitted_by_user_id)
CREATE POLICY cf_submitter_select ON customer_feedback
  FOR SELECT USING (submitted_by_user_id = auth.uid());

-- Allow authenticated users to INSERT attachments for feedback they submitted
CREATE POLICY cfa_authenticated_insert ON customer_feedback_attachments
  FOR INSERT WITH CHECK (
    feedback_id IN (
      SELECT id FROM customer_feedback
      WHERE submitted_by_user_id = auth.uid()
         OR customer_account_id IN (
           SELECT id FROM customer_accounts WHERE auth_user_id = auth.uid()
         )
    )
  );

COMMENT ON COLUMN customer_feedback.submitted_by_user_id IS 'Auth user UUID of submitter — set for all submissions, required when customer_account_id is null (CRM/internal users)';
