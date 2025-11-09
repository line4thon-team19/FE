import React from 'react'
import lion_icon from '../assets/lion.svg'
import sad_lion_icon from '../assets/sadlion.svg'

const LionComment = ({message, gameState}) => {
  const lionIcon = (gameState === 'lose') ? sad_lion_icon : lion_icon;
  return (
    <div id="LionComponent_wrap">
        <div className="lion_icon">
          <img src={lionIcon} alt="" className={`lion-icon-${gameState}`}/>
        </div>
        <div className="comment">
          {message}
        </div>
    </div>
  )
}

export default LionComment