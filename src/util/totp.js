import otplib from 'otplib'
import { promisify } from 'util'
import QRCode from 'qrcode'

const { authenticator } = otplib
const genQRCodeDataURI = promisify(QRCode.toDataURL)

authenticator.options = { window: 1 }

export function checkMFAToken({ secret, token }) {
  return authenticator.verify({ secret, token })
}

export async function genMFAQRCodeURL({ identifier, secret }) {
  const uri = authenticator.keyuri(identifier, 'TopTunez', secret)
  try {
    return await genQRCodeDataURI(uri, { scale: 8 })
  } catch (err) {
    return `<QRCode Generation Error: ${err.message}>`
  }
}

export function genMFASecret() {
  return authenticator.generateSecret()
}
