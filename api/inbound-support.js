export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true });
  try {
    const body = req.body || {};
    const data = body.data || body;
    const emailId = data.email_id;
    const from = data.from || '?';
    const subject = data.subject || 'No subject';
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      console.error('RESEND_API_KEY env var is not set');
      return res.status(200).json({ ok: true });
    }

    let content = '';

    if (emailId) {
      // Inbound emails live under /emails/receiving/{id}; /emails/{id} is only for sent mail.
      for (const url of [
        'https://api.resend.com/emails/receiving/' + emailId,
        'https://api.resend.com/emails/' + emailId,
      ]) {
        const emailRes = await fetch(url, {
          headers: { Authorization: 'Bearer ' + key }
        });
        if (emailRes.ok) {
          const emailData = await emailRes.json();
          content = emailData.html || emailData.bodyHtml || '';
          if (!content && (emailData.text || emailData.bodyText)) {
            content = '<pre style="font-family:inherit;white-space:pre-wrap">' +
              String(emailData.text || emailData.bodyText)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') +
              '</pre>';
          }
          if (content) break;
        }
      }
    }

    if (!content) content = '(no content from api)';

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SellSense Support <noreply@sellsenseapp.com>',
        to: ['sellsenseapp@gmail.com'],
        subject: '[Support] ' + subject + ' (from: ' + from + ')',
        html: content,
      }),
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
