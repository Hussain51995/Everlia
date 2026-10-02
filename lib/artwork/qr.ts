import QRCode from "qrcode";

export async function generateQrPngBuffer(
  url: string,
  size = 280
): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: "png",
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    color: {
      dark: "#0B1F3D",
      light: "#00000000",
    },
  });
}
