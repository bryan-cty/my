const clock = document.querySelector('#clock');

function updateClock() {
  if (!clock) return;
  const now = new Date();
  clock.textContent = now.toLocaleTimeString('en-SG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

updateClock();
setInterval(updateClock, 30000);

document.querySelectorAll('.folder-list a').forEach((link) => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.folder-list a').forEach((item) => item.classList.remove('active'));
    link.classList.add('active');
  });
});
