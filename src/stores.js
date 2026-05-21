import { writable } from 'svelte/store'

const STORAGE_KEY = 'verbatim-ui-state-v1'

const initial = {
  speakers: [
    { id: 'sp1', name: 'Alice', color: '#ef4444' },
    { id: 'sp2', name: 'Bob', color: '#4f46e5' }
  ],
  bubbles: [
    {
      id: 'b1',
      speakerId: 'sp1',
      words: [
        { text: 'Hello', ts: '00:00:01' },
        { text: 'world,', ts: '00:00:02' },
        { text: "this", ts: '00:00:03' },
        { text: 'is', ts: '00:00:04' },
        { text: 'Alice.', ts: '00:00:05' }
      ]
    },
    {
      id: 'b2',
      speakerId: 'sp2',
      words: [
        { text: 'Hi', ts: '00:00:06' },
        { text: "Alice,", ts: '00:00:07' },
        { text: 'how', ts: '00:00:08' },
        { text: 'are', ts: '00:00:09' },
        { text: 'you?', ts: '00:00:10' }
      ]
    }
  ]
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY)
    if(raw) return JSON.parse(raw)
  }catch(e){console.warn('load state failed',e)}
  return initial
}

function saveState(state){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) }catch(e){console.warn('save failed',e)}
}

const state = writable(loadState())

state.subscribe(s => saveState(s))

function updateState(mutator){
  state.update(s => { mutator(s); return s })
}

export { state, updateState }
