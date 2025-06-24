    const firebaseConfig = {
      apiKey: "AIzaSyDoWfAhh1VmfYnokSZs9enq8s1liRL5t0",
      authDomain: "kmindlinker.firebaseapp.com",
      projectId: "kmindlinker",
      storageBucket: "kmindlinker.appspot.com",
      messagingSenderId: "544037002770",
      appId: "1:544037002770:web:a374f6c4a94bece58b82cb",
      measurementId: "G-Q3N5L45VD3"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    let currentWordPair = "";
    let currentHint = "";

    function updateDateTime() {
      const now = new Date();
      const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit'
      };
      document.getElementById("dateTime").textContent = now.toLocaleDateString('ko-KR', options);
    }

    function showLoading(elementId) {
      const element = document.getElementById(elementId);
      element.innerHTML = '<span class="loading"></span>불러오는 중...';
    }

    // 탭 전환 함수
    function switchTab(tabName) {
      // 모든 탭 버튼과 컨텐츠 비활성화
      document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      
      // 선택된 탭 활성화
      document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
      document.getElementById(`${tabName}-tab`).classList.add('active');
      
      // 다른 사람들의 생각 탭을 선택했을 때 답변 로드
      if (tabName === 'others') {
        document.getElementById("answerList").innerHTML = "";
        lastVisible = null;
        loadAnswers(true); // 초기 로딩

      }
    }

    fetch('./data/Daily_data.json')
      .then(res => res.json())
      .then(data => {
        const today = new Date().toISOString().slice(0, 10);
        const entry = data.find(d => d.Date === today);
        if (entry) {
          currentWordPair = `${entry["Concept A"]} vs ${entry["Concept B"]}`;
          currentHint = entry["Hint/Description"];
          document.getElementById('wordPair').innerHTML = `<strong>${currentWordPair}</strong>`;
          document.getElementById('wordPair').classList.add('pulse');
          setTimeout(() => {
            document.getElementById('wordPair').classList.remove('pulse');
          }, 2000);
        } else {
          document.getElementById('wordPair').innerHTML = "❌ 오늘의 단어쌍이 없습니다.";
        }
      })
      .catch(err => {
        console.error('Error loading daily data:', err);
        document.getElementById('wordPair').innerHTML = "⚠️ 데이터를 불러올 수 없습니다.";
      });

    function toggleHint() {
      const hintEl = document.getElementById('hint');
      const isVisible = hintEl.style.display !== 'none';
      
      if (isVisible) {
        hintEl.style.display = 'none';
      } else {
        hintEl.style.display = 'block';
        hintEl.textContent = currentHint || "힌트가 없습니다.";
      }
    }

    function submitAnswer() {
      const text = document.getElementById('userAnswer').value.trim();
      if (!text) {
        showNotification("답변을 입력해주세요.", "warning");
        return;
      }

      const submitButton = event.target;
      const originalText = submitButton.textContent;
      submitButton.textContent = '제출 중...';
      submitButton.disabled = true;

      db.collection("answers").add({
        text,
        wordPair: currentWordPair,
        timestamp: new Date().toISOString()
      }).then(() => {
        document.getElementById('userAnswer').value = '';
        showNotification("답변이 성공적으로 제출되었습니다!", "success");
        // 제출 후 자동으로 다른 사람들의 생각 탭으로 전환
        switchTab('others');
      }).catch(err => {
        console.error('Error submitting answer:', err);
        showNotification("제출 중 오류가 발생했습니다.", "error");
      }).finally(() => {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
      });
    }

    function showNotification(message, type = 'info') {
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        left: 20px;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideInDown 0.3s ease-out;
        background: ${type === 'success' ? 'linear-gradient(135deg, #48bb78, #38a169)' : 
                     type === 'error' ? 'linear-gradient(135deg, #f56565, #e53e3e)' : 
                     'linear-gradient(135deg, #667eea, #764ba2)'};
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        text-align: center;
        font-size: 0.9rem;
      `;
      notification.textContent = message;
      document.body.appendChild(notification);

      setTimeout(() => {
        notification.remove();
      }, 3000);
    }

    function loadAnswers() {
      let lastVisible = null;

      function loadAnswers(initial = true) {
        const answerList = document.getElementById("answerList");
        const loadMoreBtn = document.getElementById("loadMoreBtn");

        let query = db.collection("answers")
                      .orderBy("timestamp", "desc")
                      .limit(20);

        if (!initial && lastVisible) {
          query = query.startAfter(lastVisible);
        }

        query.get().then(snapshot => {
          if (snapshot.empty) {
            loadMoreBtn.style.display = "none"; // 더 이상 데이터 없음
            return;
          }

          snapshot.forEach(doc => {
            const data = doc.data();
            const card = document.createElement("div");
            card.className = "answer-card";

            const wordPair = document.createElement("div");
            wordPair.className = "answer-word-pair";
            wordPair.textContent = data.wordPair;

            const text = document.createElement("div");
            text.className = "answer-text";
            text.textContent = data.text;

            const timestamp = document.createElement("div");
            timestamp.className = "answer-timestamp";
            timestamp.textContent = formatTimestamp(data.timestamp);

            card.appendChild(wordPair);
            card.appendChild(text);
            card.appendChild(timestamp);
            answerList.appendChild(card);
          });

          lastVisible = snapshot.docs[snapshot.docs.length - 1];

          if (snapshot.size < 20) {
            loadMoreBtn.style.display = "none";
          } else {
            loadMoreBtn.style.display = "block";
          }
        });
      }

    }

    window.onload = () => {
      updateDateTime();
      setInterval(updateDateTime, 60000);
    };

    function applyTheme(theme) {
      document.body.setAttribute('data-theme', theme);
      document.querySelector('.theme-toggle').textContent = theme === 'dark' ? '🌞' : '🌙';
    }

    function toggleTheme() {
      const current = document.body.getAttribute('data-theme');
      applyTheme(current === 'dark' ? 'light' : 'dark');
    }

    (function initializeTheme() {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        applyTheme('dark');
      } else {
        applyTheme('light');
      }
    })();

    // 키보드 단축키 추가
    document.addEventListener('DOMContentLoaded', function() {
      document.getElementById('userAnswer').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          submitAnswer();
        }
      });
    });