const axios= require('axios')


exports.getFacebookAccessToken= async(code)=>{
    const params= {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
        code
    }

    const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', { params })
    return response.data.access_token
}


exports.getFacebookUserProfile= async(code)=>{
    const params = {
        fields: 'id,name,email,picture',
        access_token: accessToken,
      }

    const response = await axios.get('https://graph.facebook.com/me', { params })
    return response.data
}

