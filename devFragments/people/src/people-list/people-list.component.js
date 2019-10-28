import React, {Fragment} from 'react'
import { Scoped } from 'kremling'
import { getPeople } from '../utils/api.js'
import styles from './people-list.krem.css'
import { withRouter } from 'react-router'
import { Link } from 'react-router-dom'

@withRouter
export default class PeopleList extends React.Component {

  render () {
    const { people, loadingPeople, selectPerson } = this.props
    return (
      <Scoped postcss={styles}>
        <div className='peopleList'>
          <Fragment>
            {
              people.map((person, index) => {
                return (
                  <Link
                    key={person.name}
                    className='person'
                    to={`${this.props.match.path}?selected=${window.encodeURIComponent(person.id)}`}
                  >
                    {person.name}
                  </Link>
                )
              })
            }
            {
              loadingPeople && (
                <div>
                  Loading ...
                </div>
              )
            }
          </Fragment>
        </div>
      </Scoped>
    )
  }

  onKeyPress = (evt, index) => {
    if (evt.key === 'Enter' || evt.key === ' ') {
      this.props.selectPerson(index)
    }
  }
}
