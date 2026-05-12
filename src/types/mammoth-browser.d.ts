declare module 'mammoth/mammoth.browser' {
  export interface MammothMessage {
    type: string
    message: string
  }

  export interface ExtractRawTextResult {
    value: string
    messages: MammothMessage[]
  }

  export function extractRawText(options: {
    arrayBuffer: ArrayBuffer
  }): Promise<ExtractRawTextResult>
}
