/* Cores dos cartões por status */

.child-card {
  transition:
    background-color .2s ease,
    border-color .2s ease,
    box-shadow .2s ease,
    transform .2s ease;
}

/* 🟢 DISPONÍVEL */
.child-card:not(.is-unavailable) {
  background: #f0f8ee;
  border: 3px solid #5f9658;
  box-shadow:
    inset 0 0 0 1px #d8ead3,
    0 8px 20px #315d2d18;
}

/* ❤️ APADRINHADA */
.child-card.is-sponsored {
  background: #fff0f1;
  border: 3px solid #c96b72;
  box-shadow:
    inset 6px 0 0 #c96b72,
    0 8px 20px #7a303518;
}

/* 📦 PRESENTE RECEBIDO */
.child-card.is-unavailable:has(.status-received) {
  background: #eef6fb;
  border: 3px solid #5d91b2;
  box-shadow:
    inset 6px 0 0 #5d91b2,
    0 8px 20px #315d2d18;
}

/* Mantém o cartão recebido sem transparência */
.child-card.is-unavailable:has(.status-received) {
  opacity: 1;
}

/* Etiqueta de presente recebido */
.status-received {
  color: #356b8a;
  border-color: #c5dce9;
  background: #e5f1f7;
}
