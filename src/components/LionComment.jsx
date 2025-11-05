import React from 'react'
import lion from '../assets/images/lion.svg'
import sad_lion_icon from '../assets/images/sad_lion.svg'

const LionComment = () => {
  return (
    <div id="LionComponent_wrap">
        <div className="lion_icon">
          <img src={sad_lion_icon} alt="" />
        </div>
        <div className="comment">
          아쉬워요 어흥...
          <br />연습하고 한번 더?
        </div>
    </div>
  )
}

export default LionComment