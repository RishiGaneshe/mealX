const { S3Client }= require('../services/s3BucketConnection_services')
const path= require('path')
const { v4: uuidv4 } = require('uuid')
const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3")


exports.uploadFileToS3= async(file,aws_folder)=>{
    try{
        const fileExtension = path.extname(file.originalname)
        const Key = `${aws_folder}/${uuidv4()}-${fileExtension}`

        const params = {
            Bucket: process.env.AWS_Bucket,
            Key,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read'
          }

        try {
            const commandToUpload = new PutObjectCommand(params)
            const response = await S3Client.send(commandToUpload)
        } catch (err) {
            console.error("Error uploading file to S3:", err.message)
            throw new Error("Failed to upload file to S3. Please try again.")
        }

        const url= `https://${process.env.AWS_Bucket}.s3.${process.env.AWS_Region}.amazonaws.com/${Key}`
        return url

    }catch(err){
        console.error("Error in file Upload: "+ err)
        throw err
    }
}