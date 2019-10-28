import React from 'react'
import { Scoped } from 'kremling'
import styles from './root.krem.css'
import { links } from './root.helper.js'
import { Link } from '@reach/router'

const NavLink = props => (
    <Link
        {...props}
        getProps={({ isPartiallyCurrent }) => {
          // the object returned here is passed to the
          // anchor element's props
          return {
            style: {
              color: isPartiallyCurrent ? "red" : ''
            }
          };
        }}
    />
);

export default class Root extends React.Component {

  state = {
    hasError: false
  };

  componentDidCatch (error, info) {
    this.setState({hasError: true})
  }

  render () {
    return (
      <Scoped postcss={styles}>
        {
          this.state.hasError ? (
            <div className='root navBarHeight'>
              Error
            </div>
          ) : (
            <div className='root navBarHeight'>
              {
                links.map((link) => {
                  return (
                      <NavLink key={link.href}
                        to={link.href}
                        className='primary-navigation-link'>
                      {link.name}
                    </NavLink>
                  )
                })
              }
            </div>
          )
        }
      </Scoped>
    )
  }
}
