import models from '../../database/models'
import { convertToPostDto } from '../../dto/posts'
import { Authentication } from '../../middlewares/authentication'

/*
Requires authentication.
Response codes:
201 CREATED when the post has successfully been created.
500 INTERNAL SERVER ERROR otherwise.
*/
export const createPost = async (req, res) => {
    try {
        // Check whether the authentication token is valid.
        const authToken = req.get('Authorization')
        const { body } = req

        if (!authToken) {
            res.status(400).send({
                'Error message': 'Auth token not provided',
            })
        } else {
            const decodedUser = Authentication.extractUser(authToken)

            if (!decodedUser.id) {
                res.status(401).send({ 'Error message': 'Auth token invalid' })
            }

            // Check whether the parent post exists.
            const parent = await models.posts.findByPk(body.parent)

            if (parent || body.parent == null) {
                // Create the post in the database.
                const post = await models.posts.create({
                    text_content: body.text_content,
                    author: decodedUser.id,
                    parent: body.parent,
                })
                const postDTO = await convertToPostDto(post)
                res.status(201).send(postDTO)
            } else {
                res.status(404).send({
                    'Error message': 'Parent with that id does not exist.',
                })
            }
        }
    } catch (error) {
        console.log(error)
        res.status(500).send(error)
    }
}

/*
Does not require authentication.
Path paramter: id - the id of the post that is being retrieved.
Response Codes:
200 OK when the post has been successfully found.
404 NOT FOUND when the post with that id can not be found.
500 INTERNAL SERVER ERROR for everything else.
*/
export const getPostById = async (req, res) => {
    try {
        // Check whether a post with the id exists.
        const { params } = req
        const post = await models.posts.findByPk(params.id)
        if (post != null) {
            // Returns the postDTO object if a post with the id exists.
            const postDTO = await convertToPostDto(post)
            res.status(200).send(postDTO)
        } else {
            res.status(404).send('ID not found.')
        }
    } catch (error) {
        res.status(500).send(error)
    }
}

/*
Requires authentication.
Path paramter: id - the id of the post that is being modified.
Response Codes:
200 OK when the post has been successfully modified.
404 NOT FOUND when the post with that id can not be found.
500 INTERNAL SERVER ERROR for everything else.
*/
export const modifyPostById = async (req, res) => {
    try {
        // Authentication
        const authToken = req.get('Authorization')

        if (!authToken) {
            res.status(400).send({
                'Error message': 'Auth token not provided',
            })
        } else {
            const decodedUser = Authentication.extractUser(authToken)

            if (!decodedUser.id) {
                res.status(401).send({
                    'Error message': 'Auth token invalid',
                })
            } else {
                const { params, body } = req

                // Check whether the post being updated belongs to that user.
                const post = await models.posts.findByPk(params.id)
                if (!post) {
                    res.status(404).send('Invalid message ID.')
                } else if (post.author === decodedUser.id) {
                    // Update the selected row in the database.
                    const updated = await models.posts.update(
                        {
                            text_content: body.text_content,
                        },
                        { returning: true, where: { id: params.id } }
                    )
                    if (updated) {
                        res.status(200).send('The message has been updated.')
                    } else {
                        res.status(500).send('Failed to update the post.')
                    }
                } else {
                    res.status(403).send('Invalid author ID.')
                }
            }
        }
    } catch (error) {
        console.log(error)
        res.status(500).send(error)
    }
}

/*
Requires authentication.
Path parameter: id - the id of the post that is being deleted.
Response Codes:
200 OK when the post has been successfully deleted.
404 NOT FOUND when the post with that id can not be found.
500 INTERNAL SERVER ERROR for everything else.
*/
export const deletePostById = async (req, res) => {
    try {
        // Authentication
        const authToken = req.get('Authorization')

        if (!authToken) {
            res.status(400).send({
                'Error message': 'Auth token not provided',
            })
        } else {
            const decodedUser = Authentication.extractUser(authToken)

            if (!decodedUser.id) {
                res.status(401).send({
                    'Error message': 'Auth token invalid',
                })
            } else {
                const { params } = req

                // Check whether the post being deleted belongs to that user.
                const post = await models.posts.findByPk(params.id)
                if (!post) {
                    res.status(404).send('Invalid post ID.')
                } else if (post.author === decodedUser.id) {
                    const count = await models.posts.destroy({
                        where: { id: params.id },
                    })
                    if (count !== 0) {
                        res.status(200).send('The post has been deleted.')
                    } else {
                        res.status(500).send('Failed to destroy the post.')
                    }
                } else {
                    res.status(403).send('Invalid author ID.')
                }
            }
        }
    } catch (error) {
        res.status(500).send(error)
    }
}

export const sharePostById = async (req, res) => {
    try {
        // Check whether the authentication token is valid.
        const authToken = req.get('Authorization')
        const { params } = req

        if (!authToken) {
            res.status(400).send({
                'Error message': 'Auth token not provided',
            })
        } else {
            const decodedUser = Authentication.extractUser(authToken)

            if (!decodedUser.id) {
                res.status(401).send({ 'Error message': 'Auth token invalid' })
            }

            // Check whether the post id is valid.
            const targetPost = await models.posts.findByPk(params.id)

            if (targetPost) {
                // Share the post.
                const postShared = await models.sharedPost.create({
                    postId: targetPost.id,
                    userId: decodedUser.id,
                })
                if (postShared) {
                    res.status(201).send('Post shared.')
                } else {
                    res.status(500).send('Failed to share the post.')
                }
            } else {
                res.status(404).send({
                    'Error message': 'Parent with that id does not exist.',
                })
            }
        }
    } catch (error) {
        res.status(500).send(error)
    }
}

export const unsharePostById = async (req, res) => {
    try {
        // Check whether the authentication token is valid.
        const authToken = req.get('Authorization')
        const { params } = req

        if (!authToken) {
            res.status(400).send({
                'Error message': 'Auth token not provided',
            })
        } else {
            const decodedUser = Authentication.extractUser(authToken)

            if (!decodedUser.id) {
                res.status(401).send({ 'Error message': 'Auth token invalid' })
            } else {
                // Delete the tuple that indicates the post has been shared by the user.
                const count = await models.sharedPost.destroy({
                    where: { postId: params.id, userId: decodedUser.id },
                })

                if (count) {
                    res.status(200).send('The post has been unshared.')
                } else {
                    res.status(404).send(
                        'The post was not shared by the user before.'
                    )
                }
            }
        }
    } catch (error) {
        res.status(500).send(error)
    }
}
