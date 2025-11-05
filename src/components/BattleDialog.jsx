/**
 * 배틀 다이얼로그 컴포넌트
 */

import { useState, useEffect, useRef } from 'react';
import { createBattleRoom, getBattleRoomStatus } from '../services/battleApi';
import './BattleDialog.css';

function BattleDialog({ onClose, onStart }) {
  const [inviteLink, setInviteLink] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [canStart, setCanStart] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const pollingIntervalRef = useRef(null);

  // 배틀룸 생성
  useEffect(() => {
    const createRoom = async () => {
      setIsLoading(true);
      try {
        const response = await createBattleRoom();
        const roomCode = response.roomCode;
        setSessionId(response.sessionId);
        setRoomCode(roomCode);
        
        // 실제 URL로 초대 링크 생성
        const baseUrl = window.location.origin;
        const inviteLink = `${baseUrl}/join/${roomCode}`;
        setInviteLink(inviteLink);
      } catch (error) {
        console.error('배틀룸 생성 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    createRoom();
  }, []);

  // 배틀룸 상태 확인 (폴링)
  useEffect(() => {
    if (!roomCode) return;

    const checkRoomStatus = async () => {
      try {
        const status = await getBattleRoomStatus(roomCode);
        // 플레이어가 2명 이상이면 시작 가능
        if (status.players && status.players.length >= 2) {
          setCanStart(true);
          // 시작 가능하면 폴링 중지
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      } catch (error) {
        console.error('배틀룸 상태 확인 실패:', error);
      }
    };

    // 초기 확인
    checkRoomStatus();

    // 2초마다 상태 확인 (폴링)
    pollingIntervalRef.current = setInterval(checkRoomStatus, 2000);

    // 컴포넌트 언마운트 시 정리
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [roomCode]);

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
  const handleStart = () => {
    if (canStart && onStart) {
      onStart(sessionId);
    }
  };

  return (
    <div className="battle-dialog-overlay" onClick={onClose}>
      <div className="battle-dialog" onClick={(e) => e.stopPropagation()}>
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
            className={`battle-dialog__start-button ${canStart ? 'battle-dialog__start-button--active' : ''}`}
            onClick={handleStart}
            disabled={!canStart || !sessionId}
          >
            시작하기
          </button>
        </div>
      </div>
    </div>
  );
}

export default BattleDialog;

