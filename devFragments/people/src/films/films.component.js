import React, {Fragment} from 'react'
import AsyncDecorator from 'async-decorator/rx6'
import { Scoped } from 'kremling'
import { find } from 'lodash'
import { pipe, from, operators } from 'rxjs'
const { tap, mergeMap, switchMap } = operators
import styles from './films.krem.css'
import { getFilm } from '../utils/api.js'
import Film from './film.component.js'

@AsyncDecorator
export default class Films extends React.Component {

  state = {
    films: [],
    error: false
  }

  componentDidMount() {
    this.props.cancelWhenUnmounted(
      this.props.stream(
        (props) => {
          return props.films
        }
      )
      .pipe(
        switchMap(films => from(films)),
        tap(() => this.setState({films: []})),
        mergeMap(film => {
          return getFilm(film.match(/[0-9]+/))
        }),
      ).subscribe(
        (film) => {
          this.setState(prev => {
            const films = [...prev.films, film]
            return {films}
          })
        },
        (err) => this.setState({error: true})
      )
    )
  }

  render () {
    const { films, error } = this.state
    return (
      <Scoped postcss={styles}>
        <div className='films'>
          {
            error && (
              <div>
                Error
              </div>
            )
          }
          {
            films.length !== this.props.films.length && !error && (
              <div>
                ... Loading
              </div>
            )
          }
          {
            films.length === this.props.films.length && !error && (
              <Fragment>
                {
                  films.map((film) => {
                    return (
                      <Film key={film.episode_id} film={film}/>
                    )
                  })
                }
              </Fragment>
            )
          }
        </div>
      </Scoped>
    )
  }
}
