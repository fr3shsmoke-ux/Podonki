// Initialize Telegram Web App
const tg = window.Telegram.WebApp
tg.ready()

let currentUser = null
let currentTab = 'active'

const API_URL = '/api'

// DOM Elements
const giveawaysListDiv = document.getElementById('giveaways-list')
const participationsListDiv = document.getElementById('participations-list')
const createdListDiv = document.getElementById('created-list')
const createModal = document.getElementById('create-modal')
const createForm = document.getElementById('create-form')
const createBtn = document.getElementById('create-giveaway-btn')
const closeModalBtn = document.getElementById('close-modal')
const tabs = document.querySelectorAll('.tab')

// Initialize app
async function init() {
  try {
    const initData = tg.initData
    const response = await fetch(`${API_URL}/telegram/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData })
    })

    const data = await response.json()
    if (data.success) {
      currentUser = data.user
      loadGiveaways()
    }
  } catch (error) {
    console.error('Init error:', error)
    showError('Failed to initialize app')
  }
}

// Load giveaways
async function loadGiveaways() {
  try {
    giveawaysListDiv.innerHTML = '<div class="loading"><div class="spinner"></div></div>'

    const response = await fetch(`${API_URL}/giveaway/active`)
    const data = await response.json()

    if (data.giveaways.length === 0) {
      giveawaysListDiv.innerHTML = `
        <div class="empty-state">
          <h2>No active giveaways</h2>
          <p>Come back later!</p>
        </div>
      `
      return
    }

    giveawaysListDiv.innerHTML = data.giveaways
      .map(g => createGiveawayCard(g))
      .join('')

    // Attach event listeners
    document.querySelectorAll('.join-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const giveawayId = e.target.dataset.giveawayId
        joinGiveaway(giveawayId)
      })
    })
  } catch (error) {
    console.error('Load giveaways error:', error)
    showError('Failed to load giveaways')
  }
}

// Load user's participations
async function loadParticipations() {
  try {
    participationsListDiv.innerHTML = '<div class="loading"><div class="spinner"></div></div>'

    const response = await fetch(`${API_URL}/user/${currentUser.id}/participations`)
    const data = await response.json()

    if (data.participations.length === 0) {
      participationsListDiv.innerHTML = `
        <div class="empty-state">
          <h2>No participations yet</h2>
          <p>Join some giveaways to see them here</p>
        </div>
      `
      return
    }

    participationsListDiv.innerHTML = data.participations
      .map(p => createParticipationCard(p))
      .join('')
  } catch (error) {
    console.error('Load participations error:', error)
    showError('Failed to load participations')
  }
}

// Load user's giveaways
async function loadCreatedGiveaways() {
  try {
    createdListDiv.innerHTML = '<div class="loading"><div class="spinner"></div></div>'

    const response = await fetch(`${API_URL}/user/${currentUser.id}/giveaways`)
    const data = await response.json()

    if (data.giveaways.length === 0) {
      createdListDiv.innerHTML = `
        <div class="empty-state">
          <h2>No giveaways created</h2>
          <p>Create your first giveaway to get started</p>
        </div>
      `
      return
    }

    createdListDiv.innerHTML = data.giveaways
      .map(g => createCreatedCard(g))
      .join('')
  } catch (error) {
    console.error('Load created giveaways error:', error)
    showError('Failed to load created giveaways')
  }
}

// Create giveaway card
function createGiveawayCard(giveaway) {
  return `
    <div class="giveaway-card">
      ${giveaway.image_url ? `<img src="${giveaway.image_url}" alt="${giveaway.title}" class="giveaway-image">` : ''}
      <div class="giveaway-content">
        <div class="giveaway-title">${escapeHtml(giveaway.title)}</div>
        ${giveaway.description ? `<div style="font-size: 14px; color: #666; margin-bottom: 12px;">${escapeHtml(giveaway.description)}</div>` : ''}
        <div class="giveaway-prize">🎁 ${escapeHtml(giveaway.prize_description || 'Awesome prize')}</div>
        <div class="giveaway-stats">
          <div class="giveaway-stat">
            <span>👥</span>
            <span><strong>${giveaway.participant_count || 0}</strong> joined</span>
          </div>
          ${giveaway.subscription_required ? '<div class="giveaway-stat">🔒 Requires subscription</div>' : ''}
        </div>
        <button class="btn btn-primary join-btn" data-giveaway-id="${giveaway.id}">
          ${giveaway.status === 'active' ? 'Join Now' : 'Ended'}
        </button>
      </div>
    </div>
  `
}

// Create participation card
function createParticipationCard(participation) {
  return `
    <div class="giveaway-card">
      ${participation.image_url ? `<img src="${participation.image_url}" alt="${participation.title}" class="giveaway-image">` : ''}
      <div class="giveaway-content">
        <div class="giveaway-title">${escapeHtml(participation.title)}</div>
        <div class="giveaway-prize">🎁 ${escapeHtml(participation.prize_description || 'Prize')}</div>
        <div class="giveaway-stats">
          <div class="giveaway-stat">
            <span>${participation.won ? '🏆' : '✅'}</span>
            <span><strong>${participation.won ? 'WON!' : 'Participated'}</strong></span>
          </div>
        </div>
      </div>
    </div>
  `
}

// Create card for user's giveaway
function createCreatedCard(giveaway) {
  return `
    <div class="giveaway-card">
      <div class="giveaway-content">
        <div class="giveaway-title">${escapeHtml(giveaway.title)}</div>
        <div class="giveaway-stats">
          <div class="giveaway-stat">
            <span>👥</span>
            <span><strong>${giveaway.participants || 0}</strong> participants</span>
          </div>
          <div class="giveaway-stat">
            <span>📊</span>
            <span><strong>${giveaway.status}</strong></span>
          </div>
        </div>
      </div>
    </div>
  `
}

// Join giveaway
async function joinGiveaway(giveawayId) {
  try {
    const response = await fetch(`${API_URL}/giveaway/${giveawayId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.id,
        subscribed: true
      })
    })

    const data = await response.json()
    if (data.success) {
      showSuccess('Successfully joined giveaway!')
      loadGiveaways()
    } else {
      showError(data.error || 'Failed to join')
    }
  } catch (error) {
    console.error('Join giveaway error:', error)
    showError('Failed to join giveaway')
  }
}

// Create giveaway
createForm.addEventListener('submit', async (e) => {
  e.preventDefault()

  const formData = new FormData(createForm)
  const giveawayData = {
    title: formData.get('title'),
    description: formData.get('description'),
    prize_description: formData.get('prize_description'),
    image_url: formData.get('image_url'),
    subscription_required: formData.get('subscription_required') === 'on',
    creator_id: currentUser.id,
    max_participants: parseInt(formData.get('max_participants')) || null
  }

  try {
    const response = await fetch(`${API_URL}/giveaway/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(giveawayData)
    })

    const data = await response.json()
    if (data.success) {
      showSuccess('Giveaway created!')
      closeModal()
      createForm.reset()
      loadCreatedGiveaways()
    } else {
      showError(data.error || 'Failed to create')
    }
  } catch (error) {
    console.error('Create giveaway error:', error)
    showError('Failed to create giveaway')
  }
})

// Tab switching
tabs.forEach(tab => {
  tab.addEventListener('click', (e) => {
    const tabName = e.target.dataset.tab
    currentTab = tabName

    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tc => {
      tc.style.display = 'none'
    })

    // Update active tab button
    tabs.forEach(t => t.classList.remove('active'))
    e.target.classList.add('active')

    // Show selected tab
    const tabEl = document.getElementById(`${tabName}-tab`)
    if (tabEl) {
      tabEl.style.display = 'block'

      // Load content if needed
      if (tabName === 'participated') {
        loadParticipations()
      } else if (tabName === 'created') {
        loadCreatedGiveaways()
      }
    }
  })
})

// Modal functions
createBtn.addEventListener('click', () => {
  createModal.classList.add('active')
})

closeModalBtn.addEventListener('click', closeModal)

function closeModal() {
  createModal.classList.remove('active')
}

createModal.addEventListener('click', (e) => {
  if (e.target === createModal) {
    closeModal()
  }
})

// Utility functions
function showSuccess(message) {
  tg.showPopup({
    title: 'Success',
    message: message,
    buttons: [{ type: 'ok' }]
  })
}

function showError(message) {
  tg.showAlert(message)
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Start app
init()
