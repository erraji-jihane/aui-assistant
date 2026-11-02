import { PDFParse} from "pdf-parse";

export async function extractTextFromPDF(buffer: Buffer, mimeType: string): Promise<string> {

    let text: string;
    if (mimeType === "application/pdf") {
        const parser = new PDFParse({data: buffer});
        try{
            const result = await parser.getText();
            text = result.text;
        } finally{
            await parser.destroy();
        }
    } else {
        text = buffer.toString("utf-8");
    } 

    return text.replace(/\u0000/g, "").trim();
}