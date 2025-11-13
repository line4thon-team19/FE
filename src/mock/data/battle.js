/**
 * Battle API Mock Data
 */

// 배틀룸 생성 응답 데이터
export const createBattleRoomResponse = {
  sessionId: "p_8c3a10f2",
  roomCode: "A1B2C3",
  status: "waiting",
  hostId: "plr_w2a1bC7X9pQe",
  inviteLink: "https://app.example.com/join/A1B2C3"
};

// 배틀룸 시작 응답 데이터
export const startBattleRoomResponse = {
  started: true,
  status: "waiting",
  countdown: {
    seconds: 3
  },
  questions: [
    {
      id: "12",
      text: "우리 학교의 교장 선생님입니다.",
      wrongText: "우리 학교에 교장 선생님입니다."
    },
    {
      id: "12",
      text: "우리 학교의 교장 선생님입니다.",
      wrongText: "우리 학교에 교장 선생님입니다."
    },
    {
      id: "12",
      text: "우리 학교의 교장 선생님입니다.",
      wrongText: "우리 학교에 교장 선생님입니다."
    },
    {
      id: "12",
      text: "우리 학교의 교장 선생님입니다.",
      wrongText: "우리 학교에 교장 선생님입니다."
    },
    {
      id: "12",
      text: "우리 학교의 교장 선생님입니다.",
      wrongText: "우리 학교에 교장 선생님입니다."
    }
  ]
};

// 배틀룸 입장 응답 데이터
export const entryBattleRoomResponse = {
  sessionId: "b_9p1v4t",
  roomCode: "A1B2C3",
  state: "WAITING",
  players: [
    {
      playerId: "plr_guest",
      isHost: false
    }
  ]
};

// 배틀룸 정답 제출 응답 데이터 (기본 응답, 실제 응답 형식에 맞게 수정 필요)
export const submitAnswerResponse = {
  success: true,
  round: 3,
  isCorrect: true
};

// 배틀룸 결과 조회 응답 데이터
export const getBattleResultResponse = {
  state: "ENDED",
  result: "win",
  summary: [
    {
      playerId: "plr_host",
      isHost: true,
      score: 3,
      wrong: 2
    }
  ],
  rounds: [
    {
      round: 1,
      questionId: "q_001",
      winner: "plr_guest",
      players: [
        {
          playerId: "plr_guest",
          isCorrect: true
        }
      ]
    }
  ]
};

// 추가 mock 데이터 샘플들
export const mockBattleRooms = [
  {
    sessionId: "p_8c3a10f2",
    roomCode: "A1B2C3",
    status: "waiting",
    hostId: "plr_w2a1bC7X9pQe",
    inviteLink: "https://app.example.com/join/A1B2C3"
  },
  {
    sessionId: "p_9d4b21g3",
    roomCode: "D4E5F6",
    status: "playing",
    hostId: "plr_x3b2cD8Y0rRf",
    inviteLink: "https://app.example.com/join/D4E5F6"
  },
  {
    sessionId: "p_0e5c32h4",
    roomCode: "G7H8I9",
    status: "waiting",
    hostId: "plr_y4c3dE9Z1sSg",
    inviteLink: "https://app.example.com/join/G7H8I9"
  }
];

