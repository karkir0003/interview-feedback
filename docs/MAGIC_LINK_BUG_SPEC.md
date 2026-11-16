# Magic Link Bug Spec

**Issue**
- A user is trying to signup into MockSignal to view their hsitorical feedback, but magic link keeps getting marked as expired

**Repro**
1. Pick a junk email account to use
2. Signup using magic link with the junk email
3. Check the inbox for the magic link
4. Click on the link and if the link still routes you to the login page, check the query parameters to see indications of link expired

**What to fix**
- The magic link should be clickable and offer login when the user clicks on the link just when the email is sent (like within 5 minutes of email send)
- Look into how we can improve the signup experience and seeing if we can allow more magic link emails to get sent by supabase since teh same user reports seeing "email signup rate limit exceeded error". We should add user friendly error messages for these toast icons that show up 