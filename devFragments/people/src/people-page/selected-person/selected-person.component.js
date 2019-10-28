import React, {Fragment} from 'react'
import { Scoped } from 'kremling'
import styles from './selected-person.krem.css'
import Homeworld from './homeworld.component.js'
import Films from '../../films/films.component.js'

export default class SelectedPerson extends React.Component {

  render () {
    const { selectedPerson } = this.props
    return (
      <Scoped postcss={styles}>
        <div className='selectedPerson'>
          {
            selectedPerson !== undefined ? (
              <div>
                <div className='personName'>
                  <div className='personAttribute'>
                    <div className='attributeTitle'>
                      Name
                    </div>
                    <div>
                      {selectedPerson.name}
                    </div>
                  </div>
                </div>
                <div className='personAttribute'>
                  <div className='attributeTitle'>
                    height
                  </div>
                  <div>
                    {this.formatHeight(selectedPerson.height)}
                  </div>
                </div>
                <div className='personAttribute'>
                  <div className='attributeTitle'>
                    Mass
                  </div>
                  <div>
                    {selectedPerson.mass}
                  </div>
                </div>
                <div className='personAttribute'>
                  <div className='attributeTitle'>
                    Hair color
                  </div>
                  <div>
                    {selectedPerson.hair_color}
                  </div>
                </div>
                <div className='personAttribute'>
                  <div className='attributeTitle'>
                    Gender
                  </div>
                  <div>
                    {selectedPerson.gender}
                  </div>
                </div>
                <div className='personAttribute'>
                  <div className='attributeTitle'>
                    Birth Year
                  </div>
                  <div>
                    {selectedPerson.birth_year}
                  </div>
                </div>
                <div className='personAttribute'>
                  <div className='attributeTitle'>
                    Homeworld
                  </div>
                  <Homeworld homeworld={selectedPerson.homeworld} />
                </div>
                <div className='personAttribute'>
                  <div className='attributeTitle'>
                    Films
                  </div>
                  <Films films={selectedPerson.films} />
                </div>
              </div>
            ) : (
              <div>
                No one selected
              </div>
            )
          }
        </div>
      </Scoped>
    )
  }

  formatHeight = (heightInCm) => {
    return `${heightInCm}cm (${heightInCm * 0.0328084}ft)`
  }
}
