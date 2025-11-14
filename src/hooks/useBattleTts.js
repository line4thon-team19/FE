import { useCallback, useEffect, useRef, useState } from 'react';

export function useBattleTts({
  questionKey,
  questionText,
  endpoint,
  autoPlayDelay = 200,
}) {
  const audioRef = useRef(null);
  const autoPlayTimeoutRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isActive = true;
    if (!questionKey || !questionText) {
      setAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setError(null);
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    const fetchTts = async (retryCount = 0) => {
      const maxRetries = 2;
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: questionText }),
          signal: controller.signal,
        });
        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          throw new Error(`TTS 생성 요청이 실패했습니다. (${response.status}${errorText ? `: ${errorText}` : ''})`);
        }
        const data = await response.json();
        if (!data?.audio) {
          throw new Error('TTS 오디오 데이터가 없습니다.');
        }
        const audioResponse = await fetch(`data:audio/mp3;base64,${data.audio}`);
        const blob = await audioResponse.blob();
        if (!isActive) return;
        const objectUrl = URL.createObjectURL(blob);
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return objectUrl;
        });
      } catch (fetchError) {
        if (!isActive || fetchError.name === 'AbortError') return;
        
        // 네트워크 오류나 5xx 에러인 경우 재시도
        const shouldRetry = retryCount < maxRetries && (
          (fetchError instanceof TypeError && fetchError.message.includes('fetch')) ||
          (fetchError instanceof Error && fetchError.message.includes('500')) ||
          (fetchError instanceof Error && fetchError.message.includes('502')) ||
          (fetchError instanceof Error && fetchError.message.includes('503')) ||
          (fetchError instanceof Error && fetchError.message.includes('504'))
        );
        
        if (shouldRetry) {
          setTimeout(() => {
            if (isActive && !controller.signal.aborted) {
              fetchTts(retryCount + 1);
            }
          }, 1000 * (retryCount + 1));
          return;
        }
        
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        let errorMessage = 'TTS 변환 중 오류가 발생했습니다.';
        if (fetchError instanceof Error) {
          if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
            errorMessage = '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
          } else {
            errorMessage = fetchError.message;
          }
        }
        setError(new Error(errorMessage));
      } finally {
        if (isActive && !controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchTts();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [questionKey, questionText, endpoint]);

  useEffect(() => {
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
    }
    if (!audioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      setIsPlaying(false);
      return;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handlePlay = () => {
      setIsPlaying(true);
      setError(null);
    };
    const handleEnd = () => setIsPlaying(false);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('ended', handleEnd);
    audio.addEventListener('pause', handlePause);

    autoPlayTimeoutRef.current = setTimeout(() => {
      audio.play().catch(() => {
        setError(new Error('브라우저에서 자동 재생이 차단되었습니다. 스피커 버튼을 눌러 주세요.'));
      });
    }, autoPlayDelay);

    return () => {
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
        autoPlayTimeoutRef.current = null;
      }
      audio.pause();
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('ended', handleEnd);
      audio.removeEventListener('pause', handlePause);
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
      URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl, autoPlayDelay]);

  useEffect(
    () => () => {
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
        autoPlayTimeoutRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    },
    [audioUrl],
  );

  const play = useCallback(() => {
    if (!audioRef.current) {
      setError(new Error('음성이 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.'));
      return;
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {
      setError(new Error('브라우저에서 음성 재생이 차단되었습니다. 다시 시도해 주세요.'));
    });
  }, []);

  return {
    play,
    isPlaying,
    isLoading,
    error,
    hasAudio: Boolean(audioRef.current),
  };
}

