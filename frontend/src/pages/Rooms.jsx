import React from 'react';
import axios from 'axios';
import { useEffect, useState } from 'react';

export default function Rooms(){
  const [rooms, setRooms] = useState([]);
  useEffect(()=> {
    // Fetch rooms from backend API (replace URL with your backend)
    axios.get('/api/rooms/').then(r => setRooms(r.data)).catch(()=>{/* handle error */})
  },[])
  return (
    <div className='container'>
      <h2>Rooms</h2>
      {rooms.length===0 ? <p>No rooms loaded (startup scaffold)</p> :
        rooms.map(r => <div key={r.id}><h3>{r.name}</h3><p>{r.description}</p></div>)
      }
    </div>
  )
}
