import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom';

import "../styles/practice.scss";

import lionimg from "../assets/lion.svg";
import sadlionimg from "../assets/sadlion.svg";

const API = {
    START: "https://hyunseoko.store/api/practice/start",
    SUBMIT: "https://hyunseoko.store/api/practice/:sessionId/answer",
};

export default function PracticeGame({ onGoHome }) {
    const navigate = useNavigate();

    const [payload, setPayload] = useState(null);
    const [idx, setIdx] = useState(0);
    const [selected, setSelected] = useState(null);
    const [finished, setFinished] = useState(false);
    const [lionHistory, setLionHistory] = useState([]);

    const [answeredCorrect, setAnsweredCorrect] = useState(null);

    // 타이머
    const [limit, setLimit] = useState(20);
    const [secondsLeft, setSecondsLeft] = useState(20);
    const tickRef = useRef(null);
    const startedAtRef = useRef(Date.now());

    // 카운트다운
    const [countdown, setCountdown] = useState(null);
    const countdownRef = useRef(null);

    // 문제 로드
    useEffect(() => {
        let active = true;

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            console.log("Waiting for auth token...");
            return;
        }

        (async () => {
            try {
                const res = await fetch(API.START, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                    },
                    body: JSON.stringify({
                        countdown: 3,
                    }),
                });

                if (!res.ok) throw new Error(`API 요청 실패 상태 코드: ${res.status}`);


                const data = await res.json();
                if (active) {
                    setPayload(data);
                    setLimit(data?.timeLimit ?? 20);
                    setCountdown(data?.countdown?.seconds ?? 0);
                }
            } catch (err) {
                console.error("START API failed:", err);
            }
        })();
        return () => {
            active = false;
        };
    }, []);

    const q = useMemo(() => payload?.questions?.[idx], [payload, idx]);

    // 카운트다운
    useEffect(() => {
        if (countdown === null || countdown <= 0) return;
        clearInterval(countdownRef.current);
        countdownRef.current = setInterval(() => {
            setCountdown((c) => {
                if (c <= 1) {
                    clearInterval(countdownRef.current);
                    startTimer();
                    return 0;
                }
                return c - 1;
            });
        }, 1000);
        return () => clearInterval(countdownRef.current);
    }, [countdown]);

    // 타이머 시작
    function startTimer() {
        setSecondsLeft(limit);
        startedAtRef.current = Date.now();
        clearInterval(tickRef.current);
        tickRef.current = setInterval(() => {
            const left = limit - (Date.now() - startedAtRef.current) / 1000;
            setSecondsLeft(left);
        }, 100);
    }

    // 문제 바뀌면 타이머 재시작
    useEffect(() => {
        if (!payload || countdown > 0 || finished) return;
        if (q) startTimer();
    }, [q, payload, countdown, finished]);

    // 시간 초과 시 자동 제출
    useEffect(() => {
        if (secondsLeft <= 0 && countdown === 0) {
            (async () => {
                clearInterval(tickRef.current);
                const data = await submitToServer(true);
                handleAnswerResponse(data);
            })();
        }
    }, [secondsLeft, selected, countdown]);

    if (!payload) return <div>로딩중...</div>;

    // 서버 제출
    async function submitToServer(isTimeout = false) {
        const url = `https://hyunseoko.store/api/practice/${payload.sessionId}/answer`;
        const answer = isTimeout
            ? null
            : selected === 0
                ? "choice1"
                : selected === 1
                    ? "choice2"
                    : null;

        const body = {
            round: payload?.round?.current ?? lionHistory.length + 1,
            answer,
        };

        try {
            const r = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('authToken')}`,
                },
                body: JSON.stringify(body),
            });
            if (!r.ok) throw new Error("Submit failed");
            const data = await r.json();
            return data;
        } catch (err) {
            console.error("Submit error:", err);
            return null;
        }
    }

    // 서버 응답 처리
    function handleAnswerResponse(data) {
        if (!data) return;

        const result = data?.next?.result ?? data?.result;
        const isCorrect = result === "correct";

        setLionHistory((prev) => [...prev, isCorrect ? "success" : "fail"]);

        if (data?.next?.hasNext) {
            // 다음 문제
            setPayload((prev) => ({
                ...prev,
                round: data.round,
                questions: [data.next.question],
            }));
            setIdx(0);
            setSelected(null);
        } else {
            const sessionId = payload.sessionId;
            clearInterval(tickRef.current);

            navigate(`/result/practice/${sessionId}`);
        }
    }

    // 보기 선택
    function choose(i) {
        if (countdown > 0 || finished) return;
        setSelected(i);
    }

    // 다음 문제 버튼 클릭 시
    async function next() {
        if (selected === null) return;

        clearInterval(tickRef.current);
        const data = await submitToServer(false);
        handleAnswerResponse(data);
    }

    // 다시하기
    function restart() {
        setIdx(0);
        setSelected(null);
        setFinished(false);
        setLionHistory([]);
        setAnsweredCorrect(null);
        setCountdown(payload?.countdown?.seconds ?? 0);
    }

    return (
        <div className="pg-wrap">
            <TopBar round={idx + 1} lionHistory={lionHistory} />

            <Timer secondsLeft={countdown > 0 ? 0 : Math.max(0, secondsLeft)} />

            <div className="pg-question">
                {q?.text}
            </div>

            <div className="pg-choices">
                {q?.options?.map((opt, i) => (
                    <button
                        key={i}
                        className={selected === i ? "pg-choice selected" : "pg-choice"}
                        onClick={() => choose(i)}
                        disabled={countdown > 0} // countdown 중에는 비활성화
                    >
                        {opt}
                    </button>
                ))}
            </div>

            <div className="pg-bottom">
                <button className="pg-btn ghost" onClick={onGoHome}>게임 종료하기</button>
                <button
                    className="pg-btn primary"
                    onClick={next}
                    disabled={selected === null}
                >
                    다음 문제
                </button>
            </div>

            {countdown > 0 && <div className="pg-countdown">{countdown}</div>}
        </div>
    );
}

/* 상단 바: 좌측 라운드 / 가운데 타이틀 / 우측 사자 스택 */
function TopBar({ round, lionHistory }) {
    return (
        <header className="pg-top">
            <div className="pg-top__left">{round} ROUND</div>
            <div className="pg-top__center">연습모드</div>
            <div className="pg-top__right pg-life">
                {lionHistory.map((v, i) => (
                    <img
                        key={i}
                        src={v === "success" ? lionimg : sadlionimg}
                        alt=""
                        className="pg-life__icon"
                    />
                ))}
            </div>
        </header>
    );
}

function Timer({ secondsLeft }) {
    const percent = Math.max(0, Math.min(100, (secondsLeft / 20) * 100));
    return (
        <div className="pg-timer">
            <div className="pg-timer__label">{Math.ceil(secondsLeft)}초</div>
            <div className="pg-timer__track">
                <div className="pg-timer__bar" style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}