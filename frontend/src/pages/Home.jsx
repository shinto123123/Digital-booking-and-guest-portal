import React from 'react';

export default function Home(){
  return (
    <div className='container'>
      <h1>The Edens Glamp</h1>
      <p>Welcome — this React site was converted from your original PHP site. Replace this content with your page markup.</p>
      <img src={'/assets/glamp1.jpg'} alt='glamp' style={{maxWidth: '100%'}} />
    </div>
  )
}
