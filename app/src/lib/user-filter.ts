/**
 * 공통 사용자 필터 유틸리티
 *
 * 로그인 상태: user_id 기준으로만 필터
 * 비로그인 상태: device_id 기준 + user_id IS NULL
 *
 * 이 파일을 통해 5개 메인 화면이 동일한 데이터를 표시한다.
 */
import { getUser } from './auth'
import { getDeviceId } from './device-id'

export interface UserIdentity {
  userId: string | null
  deviceId: string
}

/** 현재 사용자 식별 정보 반환 */
export async function getCurrentIdentity(): Promise<UserIdentity> {
  const kakaoUser = await getUser()
  return {
    userId: kakaoUser?.id ?? null,
    deviceId: getDeviceId(),
  }
}

/**
 * user_id + device_id 컬럼이 있는 테이블에 사용자 필터 적용
 * - 로그인: .eq('user_id', userId)
 * - 비로그인: .eq('device_id', deviceId).is('user_id', null)
 */
export function applyUserFilter<T extends object>(
  query: T,
  identity: UserIdentity,
): T {
  const q = query as any
  if (identity.userId) {
    return q.eq('user_id', identity.userId)
  }
  return q.eq('device_id', identity.deviceId).is('user_id', null)
}

/**
 * device_id 컬럼만 있는 테이블 (QA 히스토리 등)
 * - 항상 device_id 기준
 */
export function applyDeviceFilter<T extends object>(
  query: T,
  identity: UserIdentity,
): T {
  return (query as any).eq('device_id', identity.deviceId)
}
