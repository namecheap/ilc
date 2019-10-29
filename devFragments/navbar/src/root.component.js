import React from 'react'
import { links } from './root.helper.js'
import { Link } from '@reach/router'

const NavLink = props => (
    <Link
        {...props}
        getProps={({ isPartiallyCurrent }) => {
          // the object returned here is passed to the
          // anchor element's props
          return {
            style: isPartiallyCurrent ? {
              color: 'red'
            } : {}
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
      this.state.hasError ? (
        <div className='navbar-app'>
          Error
        </div>
      ) : (
        <div className='navbar-app'>
            <style dangerouslySetInnerHTML={{__html: `
            .navbar-app {
                background-color: var(--primary);
                display: flex;
                align-items: center;
                height: var(--navbar-height);
            }

            .navbar-app .primary-navigation-link {
                color: var(--white);
                text-decoration: none;
                margin-left: 16px;
                margin-right: 16px;
            }

            .navbar-app .primary-navigation-link:first-child {
                margin-left: 32px;
            }
            `}}/>
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
    )
  }
}