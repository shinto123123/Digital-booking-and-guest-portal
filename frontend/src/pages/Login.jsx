import React from 'react';
import axios from 'axios';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login(){
  const [email,setEmail]=useState(''); const [password,setPassword]=useState('');
  const nav = useNavigate();
  const submit = async e => {
    e.preventDefault();
    try{
      const res = await axios.post('/api/auth/token/', {email,password});
      localStorage.setItem('access', res.data.access);
      localStorage.setItem('refresh', res.data.refresh);
      nav('/');
    }catch(err){
      alert('Login failed');
    }
  }
  return (
    <div className='container'>
      <h2>Login</h2>
      <form onSubmit={submit}>
        <input placeholder='Email' value={email} onChange={e=>setEmail(e.target.value)} required/>
        <input placeholder='Password' type='password' value={password} onChange={e=>setPassword(e.target.value)} required/>
        <button type='submit'>Login</button>
      </form>
    </div>
  )
}
