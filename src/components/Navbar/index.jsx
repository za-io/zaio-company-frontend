import React from 'react'
import logo from '../../assets/img/logo/zaio-logo-light.png'
import { Link } from 'react-router-dom'

const Navbar = () => {
  return (
    <div className='w-full flex justify-between items-center px-36 py-4 border-b border-gray-900'>
        <img className='h-10' src={logo} alt="" />
        <div className="flex items-center gap-4">
            <Link to='/login' className='text-gray-100 font-medium'>Login</Link>
            <Link to='/register' className='bg-yellow-500 px-12 py-3 rounded font-medium'>Get Starter</Link>
        </div>
    </div>
  )
}

export default Navbar