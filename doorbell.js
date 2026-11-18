const enterBtn = document.getElementById('enter-house');
const leaveBtn = document.getElementById('leave-house');
const rooms = window.paperRooms;

function enter() {
    if (document.body.classList.contains('inside')) return;
    document.body.classList.add('inside');
    rooms && rooms.enter();
    leaveBtn.focus({ preventScroll: true });
}

function stepOutside() {
    if (!document.body.classList.contains('inside')) return;
    document.body.classList.remove('inside');
    rooms && rooms.corner();
    enterBtn.focus({ preventScroll: true });
}

enterBtn.addEventListener('click', enter);
leaveBtn.addEventListener('click', stepOutside);
document.addEventListener('keydown', e => { if (e.key === 'Escape') stepOutside(); });

rooms && rooms.corner(true);
