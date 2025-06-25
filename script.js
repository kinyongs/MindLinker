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
        loadAnswers();
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

      fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, wordPair: currentWordPair })
      }).then(res => res.json())
        .then(data => {
          if (data.success) {
            document.getElementById('userAnswer').value = '';
            showNotification("답변이 성공적으로 제출되었습니다!", "success");
            switchTab('others');
          } else {
            showNotification("제출 중 오류가 발생했습니다.", "error");
          }
        }).catch(err => {
          console.error('Error submitting answer:', err);
          showNotification("제출 실패", "error");
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

    let lastTimestamp = null;
    let isLoading = false;
    let hasMore = true;
    const ANSWERS_PER_PAGE = 5;

    function loadAnswers(isInitial = true) {
      if (isLoading || (!hasMore && !isInitial)) return;

      const container = document.getElementById('answerList');

      if (isInitial) {
        showLoading('answerList');
        lastTimestamp = null;
        hasMore = true;
      } else {
        showLoadMoreSpinner();
      }

      isLoading = true;

      const url = new URL('/api/loadAnswers', window.location.origin);
      if (lastTimestamp) {
        url.searchParams.append('after', lastTimestamp);
      }

      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (isInitial) container.innerHTML = '';

          if (!data.answers || data.answers.length === 0) {
            hasMore = false;
            if (isInitial) {
              container.innerHTML = '<p style="text-align: center;">아직 제출된 답변이 없습니다.</p>';
            } else {
              showNotification("더 이상 불러올 답변이 없습니다.", "info");
            }
            removeLoadMoreButton();
            removeLoadMoreSpinner();
            return;
          }

          data.answers.forEach((answer, index) => {
            const div = document.createElement('div');
            div.className = 'answer-card';
            div.style.animationDelay = `${index * 0.1}s`;

            const timestamp = new Date(answer.timestamp).toLocaleString('ko-KR', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            div.innerHTML = `
              <div class="answer-word-pair">${answer.wordPair}</div>
              <div class="answer-text">${answer.text}</div>
              <div class="answer-timestamp">${timestamp}</div>
            `;
            container.appendChild(div);
          });

          // 업데이트
          lastTimestamp = data.lastTimestamp;
          if (data.answers.length < ANSWERS_PER_PAGE) {
            hasMore = false;
            removeLoadMoreButton();
          } else {
            addLoadMoreButton();
          }

          removeLoadMoreSpinner();
        })
        .catch(err => {
          console.error('Error loading answers:', err);
          if (isInitial) {
            container.innerHTML = '<p>답변을 불러올 수 없습니다.</p>';
          }
          removeLoadMoreSpinner();
        })
        .finally(() => {
          isLoading = false;
        });
    }


    function addLoadMoreButton() {
      const container = document.getElementById('answerList');
      let button = document.getElementById('loadMoreBtn');

      if (!button) {
        button = document.createElement('button');
        button.id = 'loadMoreBtn';
        button.className = 'action-button';
        button.style.cssText = 'margin: 20px auto; display: block; max-width: 200px;';
        button.textContent = '더 보기';
        button.onclick = () => loadAnswers(false);
      }

      container.appendChild(button); // 항상 맨 아래로 이동
    }


    function removeLoadMoreButton() {
      const button = document.getElementById('loadMoreBtn');
      if (button) button.remove();
    }

    function showLoadMoreSpinner() {
      const container = document.getElementById('answerList');
      const existing = document.getElementById('loadMoreSpinner');
      if (existing) return;
      
      const spinner = document.createElement('div');
      spinner.id = 'loadMoreSpinner';
      spinner.style.cssText = 'text-align: center; padding: 20px; color: var(--text-secondary);';
      spinner.innerHTML = '<span class="loading"></span>더 불러오는 중...';
      
      container.appendChild(spinner);
    }

    function removeLoadMoreSpinner() {
      const spinner = document.getElementById('loadMoreSpinner');
      if (spinner) spinner.remove();
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