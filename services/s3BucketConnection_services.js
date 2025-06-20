const { S3Client }= require('@aws-sdk/client-s3')

exports.S3Client= new S3Client({
    region : process.env.AWS_Region,
    credentials : {
        accessKeyId : process.env.AWS_AccessKeyId,
        secretAccessKey: process.env.AWS_AccessKey
    }
})