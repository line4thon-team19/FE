/**
 * 배틀 다이얼로그 컴포넌트
 */

import { useState, useEffect } from 'react';
import { createBattleRoom } from '../services/battleApi';
import { useBattleSocket } from '../hooks/useBattleSocket';
import './BattleDialog.css';

function BattleDialog({ onClose, onStart, onCountdownComplete }) {
  const [inviteLink, setInviteLink] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [canStart, setCanStart] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [countdown, setCountdown] = useState(null);

  const { remoteJoined } = useBattleSocket({
    sessionId,
    roomCode,
    connectDelayMs: 500,
    joinInitialDelayMs: 1500,
  });

  // 배틀룸 생성
  useEffect(() => {
    const createRoom = async () => {
      setIsLoading(true);
      try {
        const response = await createBattleRoom();
        console.debug('[BattleDialog] createBattleRoom 응답', response);

        const room =
          response?.room ??
          response?.roomInfo ??
          response?.data?.room ??
          response ??
          {};
        const roomCode =
          room.roomCode ??
          room.room_code ??
          room.code ??
          response?.roomCode ??
          response?.room_code ??
          null;
        const session =
          room.sessionId ??
          room.session_id ??
          response?.sessionId ??
          response?.session_id ??
          null;

        if (!roomCode || !session) {
          throw new Error('배틀룸 정보가 올바르지 않습니다.');
        }

        setSessionId(session);
        setRoomCode(roomCode);

        const providedInviteLink =
          response?.inviteLink ??
          response?.invite_link ??
          room.inviteLink ??
          room.invite_link ??
          null;
        let nextInviteLink = providedInviteLink;
        if (!nextInviteLink) {
          const baseUrl = window.location.origin;
          nextInviteLink = `${baseUrl}/join/${encodeURIComponent(roomCode)}`;
        }
        try {
          const parsed = new URL(nextInviteLink);
          const normalized = `${window.location.origin}${parsed.pathname}${parsed.search}`;
          console.debug('[BattleDialog] inviteLink origin 정상화', {
            original: nextInviteLink,
            normalized,
          });
          nextInviteLink = normalized;
        } catch (parseError) {
          console.debug('[BattleDialog] inviteLink URL 파싱 실패, 원본 사용', nextInviteLink);
        }
        console.debug('[BattleDialog] inviteLink 설정', nextInviteLink);
        setInviteLink(nextInviteLink);
        setCanStart(false);
        setIsStarting(false);
        setCountdown(null);
      } catch (error) {
        console.error('배틀룸 생성 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    createRoom();
  }, []);

  // 소켓에서 상대 입장 이벤트 감지
  useEffect(() => {
    if (remoteJoined) {
      console.debug('[BattleDialog] remote player joined, enabling start');
      setCanStart(true);
    }
  }, [remoteJoined]);

  useEffect(() => {
    console.debug('[BattleDialog] canStart changed', canStart);
  }, [canStart]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      if (onCountdownComplete && sessionId && roomCode) {
        onCountdownComplete({ sessionId, roomCode });
      }
      return;
    }
    const timerId = setTimeout(() => {
      setCountdown((prev) => (prev === null ? null : prev - 1));
    }, 1000);
    return () => clearTimeout(timerId);
  }, [countdown, onCountdownComplete, sessionId, roomCode]);

  const isCountdownActive = countdown !== null;

  // 링크 복사
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopySuccess(true);
    } catch (error) {
      console.error('복사 실패:', error);
    }
  };

  // 시작하기 버튼 클릭
  const handleStart = async () => {
    if (!canStart || !onStart || !sessionId) return;
    if (isStarting || isCountdownActive) return;
    setIsStarting(true);
    let shouldStartCountdown = false;
    try {
      const ok = await onStart({ sessionId, roomCode });
      shouldStartCountdown = Boolean(ok);
    } catch (error) {
      console.error('[BattleDialog] 시작하기 실패', error);
      shouldStartCountdown = false;
    }
    setIsStarting(false);
    if (shouldStartCountdown) {
      setCountdown(3);
    }
  };

  const handleOverlayClick = () => {
    if (isStarting || isCountdownActive) return;
    if (onClose) onClose();
  };

  const handleDialogClick = (e) => {
    e.stopPropagation();
  };

  const buttonDisabled = !canStart || !sessionId || isStarting || isCountdownActive;
  const buttonLabel = (() => {
    if (isCountdownActive) {
      return `${countdown}`;
    }
    return '시작하기';
  })();

  return (
    <div className="battle-dialog-overlay" onClick={handleOverlayClick}>
      <div className="battle-dialog" onClick={handleDialogClick}>
        <div className="battle-dialog__content">
          <p className="battle-dialog__instruction">
            하단 링크를 친구에게 공유해 주세요!<br/>초대 후 시작하기 버튼을 눌러 게임을 시작해요!
          </p>

          <div className="battle-dialog__link-container">
            <input
              type="text"
              className="battle-dialog__link-input"
              value={isLoading ? '링크 생성 중...' : inviteLink}
              readOnly
            />
            <button
              className={`battle-dialog__copy-button ${copySuccess ? 'battle-dialog__copy-button--success' : ''}`}
              onClick={handleCopyLink}
              disabled={!inviteLink}
            >
              {copySuccess ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M20 6L9 17l-5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
              )}
            </button>
          </div>

          <button
            className={`battle-dialog__start-button ${
              isCountdownActive
                ? 'battle-dialog__start-button--countdown'
                : !buttonDisabled
                  ? 'battle-dialog__start-button--active'
                  : ''
            }`}
            onClick={handleStart}
            disabled={buttonDisabled}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BattleDialog;

