const axios= require('axios')


exports.getFacebookAccessToken= async(code)=>{
    try{
        const params= {
            client_id: process.env.FACEBOOK_APP_ID,
            client_secret: process.env.FACEBOOK_APP_SECRET,
            redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
            code
        }
        const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', { params })
        return response.data.access_token
    }catch(err){
        console.error('[Error]: Error in getting facebook access token', err)
        throw err
    }
}


exports.getFacebookUserProfile= async(code)=>{
    try{
        const params = {
            fields: 'id,name,email,picture',
            access_token: code,
          }
        const response = await axios.get('https://graph.facebook.com/me', { params })
        return response.data

    }catch(err){
        console.error('[Error]: Error in getting user facebook profile', err)
        throw err
    }
}

