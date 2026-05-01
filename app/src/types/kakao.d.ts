declare global {
  interface Window {
    Kakao: {
      init: (appKey: string) => void
      isInitialized: () => boolean
      Share: {
        sendDefault: (options: KakaoShareOptions) => void
      }
    }
  }
}

interface KakaoShareLink {
  mobileWebUrl: string
  webUrl?: string
}

interface KakaoShareOptions {
  objectType: 'feed' | 'list' | 'location' | 'commerce' | 'text'
  text?: string
  link?: KakaoShareLink
  content?: {
    title: string
    description?: string
    imageUrl?: string
    link: KakaoShareLink
  }
  buttons?: Array<{
    title: string
    link: KakaoShareLink
  }>
}

export {}
