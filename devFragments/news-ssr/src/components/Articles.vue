<template>
    <div>
        <div class="banner">
            <h1>Headlines</h1>
        </div>
        <div class="container">
            <p class="home"><router-link to="/news/">Sources</router-link></p>
            <div class="articles">
                <ol>
                    <li v-for="article in articles" class="article">
                        <img :src="article.urlToImage" :alt="article.title">
                        <div class="meta">
                            <h2>{{article.title}}</h2>
                            <p>{{article.description}}</p>
                            <div class="redirect">
                                <a :href="article.url" target="_blank" rel="noopener">Read More</a>
                            </div>
                        </div>
                        <div class="clearfix"></div>
                    </li>
                </ol>
            </div>
        </div>
    </div>
</template>

<script>
	export default {
        metaInfo: {
            title: 'Articles - Headline News',
        },
		asyncData ({ store, route : { params: { source }} }) {
            return store.dispatch('fetchHeadlines', source)
		},
		computed: {
			articles () {
				let source = this.$route.params.source;
				return this.$store.state.news[source].articles;
			}
		}
	}
</script>

<style scoped>
    .container{
        max-width: 1000px;
        margin: auto;
        padding-top: 6rem;
    }
    .home{
        margin:3rem 0;
    }
    .banner{
        background-color: #9795A4;
        color: #F1EDEC;
    }
    .banner h1{
        padding: 6rem 2rem 6rem 0;
        font-size: 3rem;
        font-weight: 900;
        max-width: 1000px;
        margin: auto;
    }
    .articles{
        list-style: none;
    }
    .articles ol {
        padding: 0;
    }
    .article{
        list-style: none;
        border-radius: 6px;
        background-color: #515E7E;
        color: #F1EDEC;
        box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 1px 5px 0 rgba(0, 0, 0, 0.12);
        margin-bottom: 1.3rem;
    }
    .article img{
        width: 25%;
        float: left;
        border-radius: 6px 0 0 6px;
    }
    .article .meta{
        padding: 1.3rem;
        width: 75%;
        float: left;
    }
    .clearfix{
        clear: both;
        content: " ";
        display: block;
        position: relative;
        height:0;
    }
    .meta h2{
        color: #fff;
        display: block;
        font-size: 1.3rem;
        margin: 0.6rem 0;
        font-weight: 900;
    }
    .meta p{
        display: block;
        font-size: 1rem;
        color: #fff;
        line-height: 1.5;
        font-weight: 300;
    }
    .article .redirect{
        display: block;
        text-align: center;
        margin-top: 2rem;
    }
    .redirect a, .home a {
        background-color: #E8587C;
        color: #FFFFFF;
        border: none;
        border-radius: 3px;
        position: relative;
        padding: 12px 30px;
        margin: 10px 1px;
        font-size: 12px;
        font-weight: 400;
        text-decoration: none;
        text-transform: uppercase;
        letter-spacing: 0;
        will-change: box-shadow, transform;
        transition: box-shadow 0.2s cubic-bezier(0.4, 0, 1, 1), background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: none;
    }
</style>
