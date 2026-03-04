// Serviço de email usando Resend (graceful degradation se sem API key)
const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_NOREPLY = 'Granify <noreply@granify.net>'
const FROM_SUPORTE = 'Granify Suporte <suporte@granify.net>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://granify.net'

async function sendEmail(to: string, subject: string, html: string, from = FROM_NOREPLY) {
  if (!RESEND_API_KEY) {
    console.log(`[EMAIL SIMULADO] Para: ${to} | Assunto: ${subject}`)
    return
  }
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(RESEND_API_KEY)
    await resend.emails.send({ from, to, subject, html })
  } catch (err) {
    console.error('[EMAIL ERROR]', err)
  }
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const BASE = `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0fdf4;color:#0f172a;margin:0;padding:0;`
const CARD = `background:#ffffff;border:1px solid #d1fae5;border-radius:16px;padding:36px 40px;max-width:520px;margin:40px auto;`
const LOGO = `font-size:24px;font-weight:900;color:#059669;margin-bottom:24px;display:block;letter-spacing:-0.5px;`
const BTN = `display:inline-block;background:linear-gradient(135deg,#059669,#10b981);color:white;font-weight:700;text-decoration:none;padding:13px 30px;border-radius:10px;margin:20px 0;font-size:15px;`
const MUTED = `color:#64748b;font-size:13px;line-height:1.7;`
const HR = `border:none;border-top:1px solid #d1fae5;margin:24px 0;`
const FOOTER = `color:#94a3b8;font-size:11px;margin-top:4px;`
const BADGE_OK = `display:inline-block;background:#d1fae5;color:#065f46;font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px;margin-bottom:16px;`

// ─── Templates ────────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, nome: string) {
  const primeiro = nome.split(' ')[0]
  const html = `<div style="${BASE}"><div style="${CARD}">
    <span style="${LOGO}">💚 Granify</span>
    <span style="${BADGE_OK}">Conta criada com sucesso</span>
    <h1 style="font-size:26px;font-weight:800;margin:0 0 8px;">Bem-vindo, ${primeiro}! 🎉</h1>
    <p style="${MUTED}">Sua conta foi criada e você já pode acessar o Granify — sua central inteligente de finanças pessoais.</p>
    <hr style="${HR}"/>
    <p style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:12px;">🚀 Por onde começar:</p>
    <ul style="${MUTED};padding-left:20px;">
      <li>Cadastre suas <strong>contas bancárias</strong> e cartões de crédito</li>
      <li>Registre <strong>lançamentos</strong> de receitas e despesas</li>
      <li>Defina <strong>metas financeiras</strong> e acompanhe seu progresso</li>
      <li>Visualize seu <strong>fluxo de caixa</strong> com gráficos detalhados</li>
    </ul>
    <a href="${APP_URL}/dashboard" style="${BTN}">Acessar o Granify →</a>
    <p style="${MUTED}">Em caso de dúvidas, entre em contato pelo e-mail <a href="mailto:suporte@granify.net" style="color:#059669;">suporte@granify.net</a></p>
    <hr style="${HR}"/>
    <p style="${FOOTER}">Granify — Controle Financeiro Inteligente<br/>granify.net</p>
  </div></div>`
  await sendEmail(to, 'Bem-vindo ao Granify! 💚 Sua conta está pronta', html)
}

export async function sendPasswordResetEmail(to: string, nome: string, resetToken: string) {
  const primeiro = nome.split(' ')[0]
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`
  const html = `<div style="${BASE}"><div style="${CARD}">
    <span style="${LOGO}">💚 Granify</span>
    <h1 style="font-size:22px;font-weight:800;margin:0 0 8px;">Redefinição de senha</h1>
    <p style="${MUTED}">${primeiro}, recebemos uma solicitação para redefinir a senha da sua conta Granify.</p>
    <p style="${MUTED}">Clique no botão abaixo para criar uma nova senha. Este link expira em <strong>1 hora</strong>.</p>
    <a href="${resetUrl}" style="${BTN}">Redefinir minha senha →</a>
    <p style="${MUTED}">Se você não solicitou esta redefinição, ignore este e-mail. Sua senha permanecerá a mesma.</p>
    <hr style="${HR}"/>
    <p style="${MUTED};font-size:11px;">Por segurança, nunca compartilhe este link com ninguém.</p>
    <p style="${FOOTER}">Granify — granify.net</p>
  </div></div>`
  await sendEmail(to, '🔐 Redefinição de senha — Granify', html)
}

export async function sendPasswordChangedEmail(to: string, nome: string) {
  const primeiro = nome.split(' ')[0]
  const html = `<div style="${BASE}"><div style="${CARD}">
    <span style="${LOGO}">💚 Granify</span>
    <h1 style="font-size:22px;font-weight:800;margin:0 0 8px;">✅ Senha alterada com sucesso</h1>
    <p style="${MUTED}">${primeiro}, sua senha foi alterada com sucesso em ${new Date().toLocaleString('pt-BR')}.</p>
    <p style="${MUTED}">Se você não realizou esta alteração, entre em contato imediatamente com nossa equipe de suporte.</p>
    <a href="mailto:suporte@granify.net" style="${BTN}">Contatar suporte →</a>
    <hr style="${HR}"/>
    <p style="${FOOTER}">Granify — granify.net</p>
  </div></div>`
  await sendEmail(to, '✅ Sua senha Granify foi alterada', html)
}

export async function sendFaturaVencimentoEmail(to: string, nome: string, cartaoNome: string, valor: number, diaVencimento: number) {
  const primeiro = nome.split(' ')[0]
  const valorFmt = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const html = `<div style="${BASE}"><div style="${CARD}">
    <span style="${LOGO}">💚 Granify</span>
    <span style="${BADGE_OK.replace('d1fae5','fef3c7').replace('065f46','92400e')}">Fatura próxima do vencimento</span>
    <h1 style="font-size:22px;font-weight:800;margin:0 0 8px;">⚠️ Fatura vencendo em breve</h1>
    <p style="${MUTED}">${primeiro}, a fatura do seu cartão <strong>${cartaoNome}</strong> vence no dia <strong>${diaVencimento}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr>
        <td style="padding:10px;background:#f0fdf4;border-radius:8px;font-size:13px;color:#64748b;">Valor total</td>
        <td style="padding:10px;background:#f0fdf4;border-radius:8px;font-size:20px;font-weight:800;color:#059669;text-align:right;">${valorFmt}</td>
      </tr>
    </table>
    <a href="${APP_URL}/cartoes" style="${BTN}">Ver fatura →</a>
    <hr style="${HR}"/>
    <p style="${FOOTER}">Granify — granify.net</p>
  </div></div>`
  await sendEmail(to, `⚠️ Fatura ${cartaoNome} vence dia ${diaVencimento} — ${valorFmt}`, html)
}

export async function sendMetaConcluidaEmail(to: string, nome: string, metaNome: string, valorAlvo: number) {
  const primeiro = nome.split(' ')[0]
  const valorFmt = valorAlvo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const html = `<div style="${BASE}"><div style="${CARD}">
    <span style="${LOGO}">💚 Granify</span>
    <h1 style="font-size:24px;font-weight:800;margin:0 0 8px;">🎯 Meta alcançada!</h1>
    <p style="${MUTED}">Parabéns, ${primeiro}! Você concluiu a meta <strong>"${metaNome}"</strong> e atingiu o objetivo de <strong>${valorFmt}</strong>.</p>
    <p style="${MUTED}">Continue assim — o sucesso financeiro é construído um passo de cada vez. 💪</p>
    <a href="${APP_URL}/metas" style="${BTN}">Ver minhas metas →</a>
    <hr style="${HR}"/>
    <p style="${FOOTER}">Granify — granify.net</p>
  </div></div>`
  await sendEmail(to, `🎯 Parabéns! Você atingiu a meta "${metaNome}"`, html)
}

export async function sendAdminNotificationEmail(to: string, assunto: string, corpo: string) {
  const html = `<div style="${BASE}"><div style="${CARD}">
    <span style="${LOGO}">💚 Granify Admin</span>
    <h1 style="font-size:18px;font-weight:700;margin:0 0 12px;">${assunto}</h1>
    <p style="${MUTED}">${corpo}</p>
    <hr style="${HR}"/>
    <p style="${FOOTER}">Granify Admin — granify.net</p>
  </div></div>`
  await sendEmail(to, `[Granify Admin] ${assunto}`, html, FROM_SUPORTE)
}
